// 글쓰기 페이지 스크립트

document.addEventListener('DOMContentLoaded', () => {
    const boardType = getBoardType();
    
    // 로그인 체크 - 로그인 필수
    if (!isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }
    
    // 운영자 직거래장터는 관리자만 접근 가능
    if (boardType === 'admin_shop' && !isAdmin()) {
        alert('운영자만 작성할 수 있습니다.');
        window.location.href = 'board.html?type=admin_shop';
        return;
    }
    
    // 페이지 제목 설정
    const writeTitle = document.getElementById('write-title');
    const icon = getBoardIcon(boardType);
    writeTitle.innerHTML = `<i class="fas ${icon}"></i> ${getBoardName(boardType)} - 글쓰기`;
    
    // 거래 게시판인 경우 추가 필드 표시
    const tradeFields = document.getElementById('trade-fields');
    if (boardType === 'trade' || boardType === 'admin_shop') {
        tradeFields.style.display = 'block';
        document.getElementById('item_name').required = true;
        document.getElementById('price').required = true;
    }
    
    // 폼 제출 이벤트
    const form = document.getElementById('write-form');
    form.addEventListener('submit', handleSubmit);
});

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const boardType = getBoardType();
    
    // 작성자명 자동 설정 (로그인한 사용자 정보 사용)
    let authorName;
    if (isAdmin()) {
        authorName = '관리자';
    } else {
        authorName = localStorage.getItem('name') || localStorage.getItem('username') || '회원';
    }
    
    // 폼 데이터 수집
    const postData = {
        board_type: boardType,
        title: document.getElementById('title').value.trim(),
        content: document.getElementById('content').value.trim(),
        author: authorName
    };
    
    // 거래 게시판 추가 필드
    if (boardType === 'trade' || boardType === 'admin_shop') {
        postData.item_name = document.getElementById('item_name').value.trim();
        postData.price = document.getElementById('price').value.trim();
    }
    
    // 유효성 검사
    if (!postData.title || !postData.content) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    if ((boardType === 'trade' || boardType === 'admin_shop') && (!postData.item_name || !postData.price)) {
        alert('아이템명과 가격을 입력해주세요.');
        return;
    }
    
    try {
        // 게시글 생성
        await createPost(postData);
        
        alert('게시글이 등록되었습니다.');
        window.location.href = `board.html?type=${boardType}`;
    } catch (error) {
        console.error('게시글 등록 실패:', error);
        alert('게시글 등록에 실패했습니다. 다시 시도해주세요.');
    }
}