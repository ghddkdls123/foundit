# Foundit Lambda (AWS ap-southeast-2)

## public-items-sync
경찰청 습득물 API -> 백엔드 bulk API 저장
- EventBridge 6시간마다: 전국 최근 3일
- EventBridge Scheduler 매일 03:00~03:25: 지역 6묶음으로 최근 30일 재확인
- 한국철도공사 보관 물건은 카카오 장소 검색으로 보관 역의 시·도를 찾아 region 보정
- 환경 변수: DATA_GO_KR_KEY, API_BASE_URL, INTERNAL_API_KEY, KAKAO_REST_KEY, DAYS_BACK

## image-embedding
S3 업로드 이미지 -> Bedrock Titan 임베딩(1024차원) -> 백엔드 저장

※ 키 값은 모두 Lambda 환경 변수에만 있고 코드에는 없음
