// 게시판 목록 페이지 스크립트

let currentPage = 1;
const postsPerPage = 15;
let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    const boardType = getBoardType();
    
    // 로그인 체크 - 로그인 필수
    if (!isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }
    
    // 페이지 제목 설정
    const boardTitle = document.getElementById('board-title');
    const icon = getBoardIcon(boardType);
    boardTitle.innerHTML = `<i class="fas ${icon}"></i> ${getBoardName(boardType)}`;
    
    // 글쓰기 버튼 표시 제어 (운영자 직거래장터만 관리자 전용)
    const writeBtn = document.getElementById('write-btn');
    if (boardType === 'admin_shop' && !isAdmin()) {
        writeBtn.style.display = 'none';
    }
    
    // 네비게이션 활성화
    updateNavActive();
    
    // 게시글 목록 로드
    loadPosts();
    
    // 검색 이벤트
    document.getElementById('search-btn').addEventListener('click', () => {
        currentSearch = document.getElementById('search-input').value.trim();
        currentPage = 1;
        loadPosts();
    });
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentSearch = document.getElementById('search-input').value.trim();
            currentPage = 1;
            loadPosts();
        }
    });
});

// 네비게이션 활성화
function updateNavActive() {
    const navLinks = document.querySelectorAll('.main-nav a');
    const boardType = getBoardType();
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href && href.includes(`type=${boardType}`)) {
            link.classList.add('active');
        }
    });
}

// 게시글 목록 로드
async function loadPosts() {
    const boardType = getBoardType();
    const postList = document.getElementById('post-list');
    
    postList.innerHTML = '<tr><td colspan="5" class="loading">게시글을 불러오는 중...</td></tr>';
    
    try {
        const result = await getPosts(boardType, currentPage, postsPerPage, currentSearch);
        
        if (result.data.length === 0) {
            postList.innerHTML = '<tr><td colspan="5" class="no-data">게시글이 없습니다.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        
        // 게시글 목록 렌더링
        let html = '';
        result.data.forEach((post, index) => {
            const num = result.total - ((currentPage - 1) * postsPerPage) - index;
            html += `
                <tr onclick="location.href='post.html?id=${post.id}&type=${boardType}'">
                    <td class="col-num">${num}</td>
                    <td class="col-title">
                        ${escapeHtml(post.title)}
                        ${post.is_admin ? '<span style="color: #ff6b6b; margin-left: 5px;">[운영자]</span>' : ''}
                    </td>
                    <td class="col-author">${escapeHtml(post.author)}</td>
                    <td class="col-date">${post.custom_date || getRelativeTime(post.created_at)}</td>
                    <td class="col-views">${post.views || 0}</td>
                </tr>
            `;
        });
        
        postList.innerHTML = html;
        
        // 페이지네이션
        const totalPages = Math.ceil(result.total / postsPerPage);
        renderPagination('pagination', currentPage, totalPages, 'changePage');
        
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        postList.innerHTML = '<tr><td colspan="5" class="no-data">게시글을 불러올 수 없습니다.</td></tr>';
    }
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    loadPosts();
    window.scrollTo(0, 0);
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}