// 관리자 로그인 페이지 스크립트

// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== 관리자 로그인 페이지 로드 ===');
    console.log('main.js 로드 확인:', typeof showAlert !== 'undefined');
    console.log('showAlert 함수:', typeof showAlert);
    console.log('isAdmin 함수:', typeof isAdmin);
    console.log('setAdminSession 함수:', typeof setAdminSession);
    
    // 이미 로그인된 경우 대시보드로 이동
    if (typeof isAdmin === 'function' && isAdmin()) {
        console.log('이미 로그인됨 - admin.html로 이동');
        window.location.href = 'admin.html';
        return;
    }
    
    // 로그인 폼 제출
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('로그인 폼 이벤트 리스너 등록 완료');
    } else {
        console.error('로그인 폼을 찾을 수 없습니다!');
    }
});

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    
    console.log('=== 로그인 시도 시작 ===');
    
    const adminId = document.getElementById('admin-id').value.trim();
    const adminPassword = document.getElementById('admin-password').value.trim();
    
    console.log('입력된 ID:', adminId);
    console.log('입력된 PW:', '*'.repeat(adminPassword.length));
    
    // localStorage에서 관리자 계정 정보 가져오기 (기본값: admin / admin1234)
    const storedUsername = localStorage.getItem('admin_username') || 'admin';
    const storedPassword = localStorage.getItem('admin_password') || 'admin1234';
    
    console.log('저장된 계정:', storedUsername);
    console.log('ID 일치:', adminId === storedUsername);
    console.log('PW 일치:', adminPassword === storedPassword);
    
    // 인증 확인
    if (adminId === storedUsername && adminPassword === storedPassword) {
        console.log('✅ 로그인 성공!');
        
        // 세션 설정
        if (typeof setAdminSession === 'function') {
            setAdminSession(true);
            console.log('✅ setAdminSession 호출 완료');
        } else {
            console.warn('⚠️ setAdminSession 함수 없음 - 수동 설정');
            localStorage.setItem('admin_logged_in', 'true');
        }
        
        // 알림 표시
        if (typeof showAlert === 'function') {
            showAlert('로그인 성공!', 'success');
            console.log('✅ showAlert 호출 완료');
        } else {
            console.warn('⚠️ showAlert 함수 없음 - alert 사용');
            alert('로그인 성공!');
        }
        
        // 페이지 이동
        console.log('1초 후 admin.html로 이동...');
        setTimeout(() => {
            console.log('🔄 페이지 이동 실행');
            window.location.href = 'admin.html';
        }, 1000);
        
    } else {
        console.log('❌ 로그인 실패 - 잘못된 인증 정보');
        
        // 에러 알림 표시
        if (typeof showAlert === 'function') {
            showAlert('아이디 또는 비밀번호가 올바르지 않습니다.', 'error');
            console.log('✅ showAlert (error) 호출 완료');
        } else {
            console.warn('⚠️ showAlert 함수 없음 - alert 사용');
            alert('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    }
}