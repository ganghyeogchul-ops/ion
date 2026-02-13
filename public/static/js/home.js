// 홈 페이지 스크립트

document.addEventListener('DOMContentLoaded', async () => {
    // 각 게시판의 최근 게시글 미리보기 로드
    await loadAllPreviews();
    
    // 30초마다 자동 새로고침 (실시간 업데이트)
    setInterval(async () => {
        await loadAllPreviews();
    }, 30000);
});

async function loadAllPreviews() {
    await loadBoardPreview('free', 'free-preview');
    await loadBoardPreview('trade', 'trade-preview');
    await loadBoardPreview('admin_shop', 'admin-shop-preview');
}

// 수동 새로고침 함수 (전역)
async function refreshAllBoards() {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    
    // 버튼 비활성화 및 회전 애니메이션
    btn.disabled = true;
    icon.style.animation = 'spin 1s linear infinite';
    
    await loadAllPreviews();
    
    // 버튼 활성화
    setTimeout(() => {
        btn.disabled = false;
        icon.style.animation = '';
    }, 1000);
}

// 게시판 미리보기 로드
async function loadBoardPreview(boardType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const result = await getPosts(boardType, 1, 5);
        
        if (result.data.length === 0) {
            container.innerHTML = '<p class="no-data">게시글이 없습니다.</p>';
            return;
        }
        
        let html = '';
        result.data.forEach(post => {
            // custom_date가 있으면 우선 사용, 없으면 created_at 사용
            const displayTime = post.custom_date ? post.custom_date : getRelativeTime(post.created_at);
            
            html += `
                <div class="preview-item" onclick="checkLoginAndNavigate('post.html?id=${post.id}&type=${boardType}')">
                    <div class="preview-title">${escapeHtml(post.title)}</div>
                    <div class="preview-meta">
                        <span><i class="fas fa-user"></i> ${escapeHtml(post.author)}</span>
                        <span><i class="fas fa-clock"></i> ${displayTime}</span>
                        <span><i class="fas fa-eye"></i> ${post.views || 0}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('미리보기 로드 실패:', error);
        container.innerHTML = '<p class="no-data">게시글을 불러올 수 없습니다.</p>';
    }
}

// 로그인 체크 후 이동
function checkLoginAndNavigate(url) {
    if (!isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }
    
    window.location.href = url;
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}