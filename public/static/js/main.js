// 공통 유틸리티 함수들

// API 베이스 URL
const API_BASE = 'tables';

// 알림 메시지 표시
function showAlert(message, type = 'info') {
    // 기존 알림이 있으면 제거
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // 알림 요소 생성
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert custom-alert-${type}`;
    alertDiv.innerHTML = `
        <div class="custom-alert-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 스타일 추가
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.95rem;
    `;
    
    document.body.appendChild(alertDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// 애니메이션 추가
if (!document.getElementById('alert-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'alert-animation-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        .custom-alert-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .custom-alert i {
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
}

// 날짜 포맷팅
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 상대 시간 표시
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) {
        return '방금 전';
    } else if (diff < hour) {
        return `${Math.floor(diff / minute)}분 전`;
    } else if (diff < day) {
        return `${Math.floor(diff / hour)}시간 전`;
    } else if (diff < 7 * day) {
        return `${Math.floor(diff / day)}일 전`;
    } else {
        return formatDate(timestamp).split(' ')[0];
    }
}

// URL 파라미터 가져오기
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 게시판 타입별 이름 가져오기
function getBoardName(type) {
    const names = {
        'free': '자유게시판',
        'trade': '아이템 거래장터',
        'admin_shop': '운영자 직거래장터'
    };
    return names[type] || '게시판';
}

// 게시판 타입별 아이콘 가져오기
function getBoardIcon(type) {
    const icons = {
        'free': 'fa-comments',
        'trade': 'fa-exchange-alt',
        'admin_shop': 'fa-store'
    };
    return icons[type] || 'fa-list';
}

// 로컬스토리지에서 관리자 세션 확인
function isAdmin() {
    return localStorage.getItem('admin_logged_in') === 'true';
}

// 일반 사용자 또는 관리자 로그인 확인
function isLoggedIn() {
    // 관리자로 로그인했거나 일반 사용자로 로그인한 경우
    return isAdmin() || localStorage.getItem('user_id') !== null;
}

// 관리자 세션 설정
function setAdminSession(status) {
    localStorage.setItem('admin_logged_in', status ? 'true' : 'false');
}

// 관리자 로그아웃
function logoutAdmin() {
    localStorage.removeItem('admin_logged_in');
    window.location.href = 'admin-login.html';
}

// URL에서 게시판 타입 가져오기
function getBoardType() {
    return getUrlParam('type') || 'free';
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 알림 표시
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// API 함수들

// 게시글 목록 조회
async function getPosts(boardType, page = 1, limit = 15, searchTerm = '') {
    try {
        let url = `${API_BASE}/posts?page=${page}&limit=${limit}`;
        
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        // 게시판 타입 필터링
        if (boardType !== 'all') {
            data.data = data.data.filter(post => post.board_type === boardType);
            data.total = data.data.length;
        }
        
        return data;
    } catch (error) {
        console.error('게시글 조회 오류:', error);
        return { data: [], total: 0, page: 1, limit: limit };
    }
}

// 게시글 상세 조회
async function getPost(postId) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`);
        if (!response.ok) throw new Error('게시글을 찾을 수 없습니다.');
        
        return await response.json();
    } catch (error) {
        console.error('게시글 조회 오류:', error);
        throw error;
    }
}

// 게시글 생성
async function createPost(postData) {
    try {
        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (!response.ok) throw new Error('게시글 생성 실패');
        
        return await response.json();
    } catch (error) {
        console.error('게시글 생성 오류:', error);
        throw error;
    }
}

// 게시글 수정
async function updatePost(postId, postData) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (!response.ok) throw new Error('게시글 수정 실패');
        
        return await response.json();
    } catch (error) {
        console.error('게시글 수정 오류:', error);
        throw error;
    }
}

// 게시글 삭제
async function deletePost(postId) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('게시글 삭제 실패');
        
        return true;
    } catch (error) {
        console.error('게시글 삭제 오류:', error);
        throw error;
    }
}

// 조회수 증가
async function incrementViews(postId) {
    try {
        const post = await getPost(postId);
        await updatePost(postId, {
            ...post,
            views: (post.views || 0) + 1
        });
    } catch (error) {
        console.error('조회수 증가 오류:', error);
    }
}

// 댓글 목록 조회
async function getComments(postId) {
    try {
        const response = await fetch(`${API_BASE}/comments?page=1&limit=1000`);
        const data = await response.json();
        
        // postId로 필터링
        return data.data.filter(comment => comment.post_id === postId);
    } catch (error) {
        console.error('댓글 조회 오류:', error);
        return [];
    }
}

// 댓글 생성
async function createComment(commentData) {
    try {
        const response = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
        });
        
        if (!response.ok) throw new Error('댓글 생성 실패');
        
        return await response.json();
    } catch (error) {
        console.error('댓글 생성 오류:', error);
        throw error;
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    try {
        const response = await fetch(`${API_BASE}/comments/${commentId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('댓글 삭제 실패');
        
        return true;
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        throw error;
    }
}

// 페이지네이션 렌더링
function renderPagination(containerId, currentPage, totalPages, onClickFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    
    // 이전 버튼
    if (currentPage > 1) {
        html += `<button onclick="${onClickFunction}(${currentPage - 1})" class="page-btn">이전</button>`;
    }
    
    // 페이지 번호
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i}</button>`;
        } else {
            html += `<button onclick="${onClickFunction}(${i})" class="page-btn">${i}</button>`;
        }
    }
    
    // 다음 버튼
    if (currentPage < totalPages) {
        html += `<button onclick="${onClickFunction}(${currentPage + 1})" class="page-btn">다음</button>`;
    }
    
    container.innerHTML = html;
}
