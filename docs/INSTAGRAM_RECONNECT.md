# Instagram 재연결 및 자동 토큰 갱신

ShortsAI 관리화면에 계정별 **인스타그램 재연결** 버튼을 추가했습니다.

## 사전 준비 (최초 한 번)

Instagram 프로필의 '앱 및 웹사이트' 만료 목록에 보이는 앱 이름만으로 OAuth 승인 주소를 생성할 수는 없습니다. 과거 앱 **ShortsAI Studio-IG**의 Instagram App ID와 Instagram App Secret은 원래 앱을 관리하는 Meta 개발자 계정에서 확인해야 합니다. 이미 만료된 API 토큰은 별도 앱 정보 없이 자동 갱신할 수 없습니다.

1. PC의 `.env`에 다음 항목을 입력합니다.
   - `INSTAGRAM_APP_ID`: 기존 앱의 Instagram App ID (YouTube Client ID와 다름)
   - `INSTAGRAM_APP_SECRET`: 기존 앱의 Instagram App Secret (채팅/깃에 올리지 않음)
   - `INSTAGRAM_REDIRECT_URI`: Meta Instagram API 앱에 등록한 정확한 **공개 HTTPS 콜백 주소** (예: `https://your-tunnel.example/api/instagram-auth/callback`)
2. 해당 HTTPS 주소가 **PC의 `http://localhost:3000`** 으로 전달되도록 안전한 HTTPS 터널/프록시를 구성합니다. Meta는 일반적인 HTTP localhost 주소를 Instagram Business Login 리디렉션으로 거부할 수 있습니다.
3. 기존 Meta 앱에서 동일한 콜백 주소를 Instagram API Business Login의 허용된 Redirect URI로 등록합니다.
4. PC에서 ShortsAI를 재시작하고 `http://localhost:3000`으로 접속합니다. 다른 PC나 휴대폰의 LAN 주소에서는 인증 관리 API가 차단됩니다.
5. **Instagram 연결 관리 → 해당 계정 재연결 → 인스타그램 로그인 → 허용**을 진행합니다. 승인한 실제 인스타그램 사용자명과 계정 ID가 채널 설정과 일치할 때만 토큰을 저장합니다.

**주의:** 이 과정에서 기존 Meta 개발자 앱의 소유 계정에 접근할 수 없다면 App ID/Secret이나 Redirect URI를 확인하거나 등록할 수 없습니다. Instagram 일반 설정 화면의 승인 목록만으로는 복구할 수 없습니다.

## 저장 및 갱신

- 발급된 장기 토큰과 만료일은 Git이 추적하지 않는 `.runtime/social-auth/instagram.json`에 저장됩니다. 토큰을 브라우저나 API 상태 응답에 출력하지 않습니다.
- 영상 게시 시 저장된 갱신 토큰을 우선합니다. 서버 시작 시, 이후 하루 한 번 만료 임박 토큰을 검사하고 **만료 15일 전부터** `ig_refresh_token` API로 자동 갱신합니다.
- 네트워크 장애로 갱신을 못 했더라도 아직 유효한 토큰은 유지하며, 이미 만료되면 **재연결이 필요**하다고 안내합니다.
- 인스타그램 게시 실패는 기존처럼 유튜브 영상 업로드 성공을 취소하지 않습니다.
- 기존 채널 설정 파일 `modules/channels/channels.json`은 그대로 보존합니다. 새로운 토큰은 별도 로컬 파일을 통해 덮어씌워 사용합니다.

## 대상

이 기능은 **Instagram Login 방식**만 처리합니다. **Threads 토큰 갱신 기능은 이번 변경에 포함하지 않았습니다.** 계정 설정 파일의 기존 `accessToken`이나 YouTube OAuth 설정을 수동 삭제하지 마세요.

## 비밀번호·키 보안

SNS 비밀번호와 발급된 토큰 또는 App Secret을 채팅, PR, GitHub 커밋에 붙여 넣지 마세요. 기존에 유출된 적이 있다면 재발급해 교체해야 합니다.
