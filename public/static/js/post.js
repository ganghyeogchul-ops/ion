// 게시글 상세 페이지 스크립트

let currentPost = null;

document.addEventListener('DOMContentLoaded', async () => {
    const postId = getUrlParam('id');
    const boardType = getBoardType();
    
    if (!postId) {
        alert('잘못된 접근입니다.');
        window.location.href = 'index.html';
        return;
    }
    
    // 로그인 체크 - 로그인 필수
    if (!isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }
    
    // 게시글 로드
    await loadPost(postId);
    
    // 댓글 로드
    await loadComments(postId);
    
    // 댓글 작성 이벤트
    document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
    
    // 거래신청 버튼 표시 (운영자 직거래장터인 경우)
    if (boardType === 'admin_shop') {
        const btnContainer = document.getElementById('trade-request-btn-container');
        if (btnContainer) btnContainer.style.display = 'block';
    }
});

// 게시글 로드
async function loadPost(postId) {
    try {
        const post = await getPost(postId);
        currentPost = post;
        
        // 조회수 증가
        await incrementViews(postId, post.views || 0);
        
        // 게시글 렌더링
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-author').textContent = post.author;
        document.getElementById('post-date').textContent = formatDate(post.created_at);
        document.getElementById('post-views').textContent = (post.views || 0) + 1;
        document.getElementById('post-content').innerHTML = escapeHtml(post.content).replace(/\n/g, '<br>');
        
        // 거래 정보 표시
        if (post.board_type === 'trade' || post.board_type === 'admin_shop') {
            document.getElementById('trade-info').style.display = 'block';
            document.getElementById('item-name').textContent = post.item_name || '-';
            document.getElementById('item-price').textContent = post.price || '-';
        }
        
        // 관리자인 경우 수정/삭제 버튼 표시
        if (isAdmin()) {
            document.getElementById('edit-btn').style.display = 'inline-flex';
            document.getElementById('delete-btn').style.display = 'inline-flex';
            
            document.getElementById('edit-btn').addEventListener('click', () => {
                alert('수정 기능은 관리자 페이지에서 이용하실 수 있습니다.');
            });
            
            document.getElementById('delete-btn').addEventListener('click', handleDelete);
        }
        
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        alert('게시글을 불러올 수 없습니다.');
        history.back();
    }
}

// 게시글 삭제
async function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const postId = getUrlParam('id');
        await deletePost(postId);
        
        alert('게시글이 삭제되었습니다.');
        goBack();
    } catch (error) {
        console.error('삭제 실패:', error);
        alert('삭제에 실패했습니다.');
    }
}

// 댓글 로드
async function loadComments(postId) {
    try {
        const comments = await getComments(postId);
        
        document.getElementById('comment-count').textContent = comments.length;
        
        const commentList = document.getElementById('comment-list');
        
        if (comments.length === 0) {
            commentList.innerHTML = '<p class="no-comments">댓글이 없습니다.</p>';
            return;
        }
        
        let html = '';
        comments.forEach(comment => {
            html += `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(comment.author)}</span>
                        <span class="comment-date">${getRelativeTime(comment.created_at)}</span>
                    </div>
                    <div class="comment-content">${escapeHtml(comment.content)}</div>
                    ${isAdmin() ? `<button class="btn-delete btn-sm comment-delete" onclick="deleteCommentById('${comment.id}')"><i class="fas fa-trash"></i> 삭제</button>` : ''}
                </div>
            `;
        });
        
        commentList.innerHTML = html;
    } catch (error) {
        console.error('댓글 로드 실패:', error);
    }
}

// 댓글 작성
async function handleCommentSubmit(e) {
    e.preventDefault();
    
    const postId = getUrlParam('id');
    
    // 작성자명 자동 설정
    let authorName;
    if (isAdmin()) {
        authorName = '관리자';
    } else {
        authorName = localStorage.getItem('name') || localStorage.getItem('username') || '회원';
    }
    
    const content = document.getElementById('comment-content').value.trim();
    
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        await createComment({
            post_id: postId,
            author: authorName,
            content: content
        });
        
        // 폼 초기화
        document.getElementById('comment-form').reset();
        
        // 댓글 목록 새로고침
        await loadComments(postId);
        
        showAlert('댓글이 등록되었습니다.', 'success');
    } catch (error) {
        console.error('댓글 등록 실패:', error);
        alert('댓글 등록에 실패했습니다.');
    }
}

// 댓글 삭제
async function deleteCommentById(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
        await deleteComment(commentId);
        
        const postId = getUrlParam('id');
        await loadComments(postId);
        
        showAlert('댓글이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
        alert('댓글 삭제에 실패했습니다.');
    }
}

// 거래신청 모달 열기
function openTradeModal(type) {
    console.log('거래신청 모달 열기:', type);
    
    const modal = document.getElementById('trade-modal');
    const modalTitle = document.getElementById('trade-modal-title');
    const tradeTypeInput = document.getElementById('trade-type');
    const sellAmountGroup = document.getElementById('sell-amount-group');
    const buyAmountGroup = document.getElementById('buy-amount-group');
    const sellAmountInput = document.getElementById('trade-sell-amount');
    const buyAmountInput = document.getElementById('trade-buy-amount');
    
    // 타입 설정
    tradeTypeInput.value = type;
    
    // 모달 제목 및 입력란 표시
    if (type === 'sell') {
        modalTitle.innerHTML = '<i class="fas fa-hand-holding-usd"></i> 판매신청';
        sellAmountGroup.style.display = 'block';
        buyAmountGroup.style.display = 'none';
        sellAmountInput.setAttribute('required', 'required');
        buyAmountInput.removeAttribute('required');
        buyAmountInput.value = '';
    } else if (type === 'buy') {
        modalTitle.innerHTML = '<i class="fas fa-shopping-cart"></i> 구매신청';
        sellAmountGroup.style.display = 'none';
        buyAmountGroup.style.display = 'block';
        buyAmountInput.setAttribute('required', 'required');
        sellAmountInput.removeAttribute('required');
        sellAmountInput.value = '';
    }
    
    // 모달 표시
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 폼 제출 이벤트 (기존 핸들러 제거 후 새로 등록)
    const form = document.getElementById('trade-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('submit', handleTradeFormSubmit);
}

// 거래신청 모달 닫기
function closeTradeModal() {
    const modal = document.getElementById('trade-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('trade-form').reset();
}

// 거래신청 폼 제출
async function handleTradeFormSubmit(e) {
    e.preventDefault();
    
    const tradeType = document.getElementById('trade-type').value;
    const name = document.getElementById('trade-name').value.trim();
    const idFront = document.getElementById('trade-id-front').value.trim();
    const idBack = document.getElementById('trade-id-back').value.trim();
    const gameId = document.getElementById('trade-game-id').value.trim();
    const sellAmount = document.getElementById('trade-sell-amount').value;
    const buyAmount = document.getElementById('trade-buy-amount').value;
    
    // 유효성 검사
    if (!name || !idFront || !idBack || !gameId) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    if (idFront.length !== 6 || idBack.length !== 1) {
        alert('주민등록번호를 정확히 입력해주세요. (앞 6자리-뒤 1자리)');
        return;
    }
    
    if (tradeType === 'sell' && (!sellAmount || sellAmount <= 0)) {
        alert('판매금액을 입력해주세요.');
        return;
    }
    
    if (tradeType === 'buy' && (!buyAmount || buyAmount <= 0)) {
        alert('구매금액을 입력해주세요.');
        return;
    }
    
    try {
        console.log('거래신청 데이터 생성 중...');
        
        const requestData = {
            post_id: currentPost.id,
            post_title: currentPost.title,
            name: name,
            id_number: `${idFront}-${idBack}`,
            game_id: gameId,
            sell_amount: tradeType === 'sell' ? parseInt(sellAmount) : 0,
            buy_amount: tradeType === 'buy' ? parseInt(buyAmount) : 0,
            trade_type: tradeType,
            status: 'completed'  // 무조건 거래완료 상태로 등록
        };
        
        console.log('전송 데이터:', requestData);
        
        // API로 거래신청 생성
        const response = await fetch('tables/trade_requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('거래신청 생성 실패');
        }
        
        const result = await response.json();
        console.log('거래신청 성공:', result);
        
        closeTradeModal();
        
        // 카카오톡 연동 (메시지 전송)
        sendKakaoMessage(requestData);
        
        alert('거래신청이 완료되었습니다.\n운영자가 확인 후 연락드리겠습니다.');
        
    } catch (error) {
        console.error('거래신청 실패:', error);
        alert('거래신청에 실패했습니다. 다시 시도해주세요.');
    }
}

// 카카오톡 메시지 전송 (시뮬레이션)
function sendKakaoMessage(data) {
    // 실제 카카오톡 API 연동이 필요한 부분
    // 여기서는 console에 메시지 출력
    const message = `
[운영자 직거래장터 거래신청]
상품: ${data.post_title}
신청자: ${data.name}
주민번호: ${data.id_number}
연락처: ${data.phone}
신청일시: ${formatDate(Date.now())}
    `;
    
    console.log('=== 카카오톡 메시지 ===');
    console.log(message);
    console.log('====================');
    
    // 실제 구현 시:
    // 1. 카카오 개발자 센터에서 앱 등록
    // 2. JavaScript SDK 로드
    // 3. Kakao.init() 초기화
    // 4. Kakao.Link.sendDefault() 또는 Kakao.API.request() 사용
    
    showAlert('거래신청 정보가 관리자에게 전송되었습니다.', 'success');
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}