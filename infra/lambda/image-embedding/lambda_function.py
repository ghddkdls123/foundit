"""
Refind 이미지 임베딩 Lambda

흐름: S3(refind-images-528730)에 items/{게시글ID}/파일명 으로 사진 업로드
  -> 이 Lambda 자동 실행
  -> Bedrock Titan Multimodal Embeddings로 숫자 1024개 추출
  -> 백엔드 내부 API(POST /api/internal/items/{id}/embedding)로 저장

필요한 환경 변수
  API_BASE_URL      예: https://d2561q9uqrldal.cloudfront.net/api
  INTERNAL_API_KEY  Beanstalk의 INTERNAL_API_KEY와 같은 값
  MODEL_ID          (선택) 기본값 amazon.titan-embed-image-v1
"""

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request

import boto3

s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime")

MODEL_ID = os.environ.get("MODEL_ID", "amazon.titan-embed-image-v1")
API_BASE_URL = os.environ["API_BASE_URL"].rstrip("/")
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]


def get_embedding(image_bytes):
    """사진을 Bedrock Titan에 보내 숫자 1024개(임베딩)를 받아온다."""
    body = json.dumps({
        "inputImage": base64.b64encode(image_bytes).decode("utf-8"),
        "embeddingConfig": {"outputEmbeddingLength": 1024},
    })
    response = bedrock.invoke_model(
        modelId=MODEL_ID,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    return json.loads(response["body"].read())["embedding"]


def send_to_backend(item_id, s3_key, embedding):
    """백엔드 내부 API로 임베딩을 저장한다. 응답 상태 코드를 돌려준다."""
    url = f"{API_BASE_URL}/internal/items/{urllib.parse.quote(item_id)}/embedding"
    data = json.dumps({
        "embedding": embedding,
        "s3Key": s3_key,
        "model": MODEL_ID,
    }).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-internal-api-key": INTERNAL_API_KEY,
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status


def lambda_handler(event, context):
    processed = []

    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        # S3 이벤트의 파일 이름은 URL 인코딩돼 있어서(공백 -> + 등) 원래대로 되돌린다
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        parts = key.split("/")
        if len(parts) < 3 or parts[0] != "items":
            print(f"[skip] items/{{id}}/파일명 형식이 아님: {key}")
            continue
        item_id = parts[1]

        image_bytes = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
        embedding = get_embedding(image_bytes)
        print(f"[embedding] {key}: {len(embedding)}개 숫자")

        try:
            status = send_to_backend(item_id, key, embedding)
            print(f"[ok] {key} -> 백엔드 응답 {status}")
            processed.append(key)
        except urllib.error.HTTPError as error:
            detail = error.read()[:300]
            print(f"[backend error] {key} -> {error.code} {detail}")
            # 400·401·404는 다시 시도해도 같은 결과라 재시도하지 않는다.
            # 500대 오류는 일시적일 수 있으니 예외를 던져 S3가 자동 재시도하게 한다.
            if error.code >= 500:
                raise

    return {"processed": processed}