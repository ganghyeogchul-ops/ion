// 관리자 대시보드 스크립트

// ===== API 함수들 =====
// 거래신청 목록 조회
async function getTradeRequests(page = 1, limit = 1000) {
    try {
        // ✅ 상대경로 문제 방지: /tables 로 고정 권장
        const response = await fetch(`/tables/trade_requests?page=${page}&limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }
        
        const result = await response.json();
        
        return {
            data: result.data || [],
            total: result.total || 0,
            page: result.page || page,
            limit: result.limit || limit
        };
    } catch (error) {
        console.error('거래신청 조회 오류:', error);
        return { data: [], total: 0, page: 1, limit: limit };
    }
}
// ===== API 함수 끝 =====

let currentTab = 'posts';
let postsPage = 1;
let requestsPage = 1;
const itemsPerPage = 20;
let boardFilter = 'all';
let postSearchQuery = '';
let requestSortType = 'date-desc'; // 기본값: 날짜순 최신순

document.addEventListener('DOMContentLoaded', async () => {
    // 관리자 인증 확인
    if (!isAdmin()) {
        alert('관리자 권한이 필요합니다.');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // 통계 로드
    await loadStats();
    
    // 게시글 관리 탭 로드
    await loadPostsTab();
    
    // 탭 전환 이벤트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    // 로그아웃 버튼
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('로그아웃 하시겠습니까?')) {
            logoutAdmin();
        }
    });
    
    // 게시판 필터
    document.getElementById('board-filter').addEventListener('change', (e) => {
        boardFilter = e.target.value;
        postsPage = 1;
        loadPostsTab();
    });
    
    // 게시글 검색
    document.getElementById('post-search').addEventListener('input', (e) => {
        postSearchQuery = e.target.value.trim();
        postsPage = 1;
        loadPostsTab();
    });
    
    // 운영자 글쓰기 폼
    const adminWriteForm = document.getElementById('admin-write-form');
    adminWriteForm.addEventListener('submit', handleAdminWrite);
    adminWriteForm.addEventListener('reset', () => {
        // 리셋 후 기본 날짜 다시 설정
        setTimeout(setDefaultDateTime, 10);
    });
    
    // 작성일 기본값을 현재 시간으로 설정
    setDefaultDateTime();
    
    // 거래신청 수정 폼 이벤트
    const editForm = document.getElementById('edit-request-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('거래신청 수정 폼 제출');
            
            const requestId = document.getElementById('edit-request-id').value;
            const dateInput = document.getElementById('edit-request-date').value;
            
            // 날짜를 "YYYY-MM-DD HH:MM" 형식으로 변환
            const selectedDate = new Date(dateInput);
            const customDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')} ${String(selectedDate.getHours()).padStart(2,'0')}:${String(selectedDate.getMinutes()).padStart(2,'0')}`;
            
            const updateData = {
                post_title: document.getElementById('edit-request-product').value.trim(),
                name: document.getElementById('edit-request-name').value.trim(),
                id_number: document.getElementById('edit-request-id-number').value.trim(),
                phone: document.getElementById('edit-request-phone').value.trim(),
                game_id: document.getElementById('edit-request-amount').value.trim(),
                sell_amount: parseInt(document.getElementById('edit-request-sell').value) || 0,
                buy_amount: parseInt(document.getElementById('edit-request-buy').value) || 0,
                status: document.getElementById('edit-request-status').value,
                custom_date: customDateStr  // created_at 대신 custom_date 사용
            };
            
            console.log('저장할 custom_date:', customDateStr);
            console.log('업데이트 데이터:', updateData);
            
            try {
                // PATCH로 업데이트
                const response = await fetch(`/tables/trade_requests/${requestId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
                
                if (!response.ok) {
                    throw new Error(`API 오류: ${response.status}`);
                }
                
                showAlert('거래신청 정보가 수정되었습니다.', 'success');
                closeEditRequestModal();
                
                // 목록 새로고침
                await loadStats();
                await loadRequestsTab();
                
            } catch (error) {
                console.error('거래신청 수정 실패:', error);
                showAlert('거래신청 수정에 실패했습니다.', 'error');
            }
        });
    }
    
    // 거래신청 추가 폼 이벤트
    const addForm = document.getElementById('add-request-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productSelect = document.getElementById('add-request-product');
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            
            if (!selectedOption.value) {
                showAlert('상품을 선택해주세요.', 'error');
                return;
            }
            
            const dateInput = document.getElementById('add-request-date').value;
            const idFront = document.getElementById('add-request-id-front').value.trim();
            const idBack = document.getElementById('add-request-id-back').value.trim();
            
            if (idFront.length !== 6 || idBack.length !== 1) {
                showAlert('주민등록번호를 정확히 입력해주세요.', 'error');
                return;
            }
            
            const requestData = {
                post_id: selectedOption.value,
                post_title: selectedOption.textContent,
                name: document.getElementById('add-request-name').value.trim(),
                id_number: `${idFront}-${idBack}`,
                phone: document.getElementById('add-request-phone').value.trim(),
                game_id: document.getElementById('add-request-amount').value.trim(),
                sell_amount: parseInt(document.getElementById('add-request-sell-amount').value) || 0,
                buy_amount: parseInt(document.getElementById('add-request-buy-amount').value) || 0,
                status: document.getElementById('add-request-status').value,
                custom_date: dateInput  // datetime-local 값을 custom_date로
            };
            
            try {
                // POST로 생성
                const createResponse = await fetch(`/tables/trade_requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                if (!createResponse.ok) throw new Error('거래신청 추가 실패');
                
                showAlert('거래신청이 추가되었습니다.', 'success');
                closeAddRequestModal();
                
                // 목록 새로고침
                await loadStats();
                await loadRequestsTab();
                
            } catch (error) {
                console.error('거래신청 추가 실패:', error);
                showAlert('거래신청 추가에 실패했습니다.', 'error');
            }
        });
    }
});

// 통계 로드
async function loadStats() {
    try {
        // 전체 게시글 가져오기
        const allPosts = await getPosts('all', 1, 10000);
        
        // 게시판별 카운트
        const freeCount = allPosts.data.filter(p => p.board_type === 'free').length;
        const tradeCount = allPosts.data.filter(p => p.board_type === 'trade').length;
        const adminShopCount = allPosts.data.filter(p => p.board_type === 'admin_shop').length;
        
        // 거래신청 카운트
        const requestsResponse = await fetch('/tables/trade_requests?page=1&limit=10000');
        const requestsData = await requestsResponse.json();
        const requestCount = (requestsData.data || []).length;
        
        // 회원 통계
        const membersResponse = await fetch('/tables/members?page=1&limit=10000');
        const membersData = await membersResponse.json();
        const memberCount = (membersData.data || []).length;
        const pendingCount = (membersData.data || []).filter(m => m.status === 'pending').length;
        
        // 통계 표시
        document.getElementById('free-count').textContent = freeCount;
        document.getElementById('trade-count').textContent = tradeCount;
        document.getElementById('admin-shop-count').textContent = adminShopCount;
        document.getElementById('request-count').textContent = requestCount;
        document.getElementById('member-count').textContent = memberCount;
        document.getElementById('pending-count').textContent = pendingCount;
        
    } catch (error) {
        console.error('통계 로드 실패:', error);
    }
}

// 탭 전환
function switchTab(tabName) {
    currentTab = tabName;
    
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // 탭 컨텐츠 표시
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // 탭별 데이터 로드
    if (tabName === 'posts') {
        loadPostsTab();
    } else if (tabName === 'requests') {
        loadRequestsTab();
    }
}

// 게시글 관리 탭 로드
async function loadPostsTab() {
    const tbody = document.getElementById('admin-post-list');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">게시글을 불러오는 중...</td></tr>';
    
    try {
        const result = await getPosts(boardFilter, postsPage, itemsPerPage, postSearchQuery);
        
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">게시글이 없습니다.</td></tr>';
            document.getElementById('posts-pagination').innerHTML = '';
            return;
        }
        
        let html = '';
        result.data.forEach((post, index) => {
            const num = result.total - ((postsPage - 1) * itemsPerPage) - index;
            html += `
                <tr>
                    <td>${num}</td>
                    <td>${getBoardName(post.board_type)}</td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <a href="post.html?id=${post.id}&type=${post.board_type}" style="color: var(--text-primary); text-decoration: none;">
                            ${escapeHtml(post.title)}
                        </a>
                    </td>
                    <td>${escapeHtml(post.author)}</td>
                    <td>${formatDate(post.created_at)}</td>
                    <td>${post.views || 0}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-edit btn-sm" onclick="openEditPostModal('${post.id}')" title="수정">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete btn-sm" onclick="deletePostById('${post.id}')" title="삭제">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // 페이지네이션
        const totalPages = Math.ceil(result.total / itemsPerPage);
        renderPagination('posts-pagination', postsPage, totalPages, 'changePostsPage');
        
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">게시글을 불러올 수 없습니다.</td></tr>';
    }
}

// 게시글 삭제
async function deletePostById(postId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        await deletePost(postId);
        showAlert('게시글이 삭제되었습니다.', 'success');
        await loadStats();
        await loadPostsTab();
    } catch (error) {
        console.error('삭제 실패:', error);
        showAlert('삭제에 실패했습니다.', 'error');
    }
}

// 게시글 페이지 변경
function changePostsPage(page) {
    postsPage = page;
    loadPostsTab();
}

// 거래신청 내역 탭 로드
async function loadRequestsTab() {
    const tbody = document.getElementById('request-list');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">거래신청 내역을 불러오는 중...</td></tr>';
    
    try {
        // 모든 거래신청 데이터를 가져옴
        const result = await getTradeRequests(1, 1000);
        
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">거래신청 내역이 없습니다.</td></tr>';
            document.getElementById('requests-pagination').innerHTML = '';
            return;
        }
        
        // 클라이언트 사이드 정렬
        let sortedData = [...result.data];
        
        if (requestSortType === 'date-desc') {
            // 날짜순 최신순 - custom_date 우선, 없으면 created_at
            sortedData.sort((a, b) => {
                const dateA = a.custom_date ? new Date(a.custom_date.replace(' ', 'T')) : new Date(a.created_at);
                const dateB = b.custom_date ? new Date(b.custom_date.replace(' ', 'T')) : new Date(b.created_at);
                return dateB - dateA;
            });
        } else if (requestSortType === 'date-asc') {
            // 날짜순 오래된순
            sortedData.sort((a, b) => {
                const dateA = a.custom_date ? new Date(a.custom_date.replace(' ', 'T')) : new Date(a.created_at);
                const dateB = b.custom_date ? new Date(b.custom_date.replace(' ', 'T')) : new Date(b.created_at);
                return dateA - dateB;
            });
        } else if (requestSortType === 'name-asc') {
            // 이름순 ㄱ-ㅎ
            sortedData.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        } else if (requestSortType === 'name-desc') {
            // 이름순 ㅎ-ㄱ
            sortedData.sort((a, b) => b.name.localeCompare(a.name, 'ko'));
        }
        
        // 페이지네이션 적용
        const totalItems = sortedData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (requestsPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = sortedData.slice(startIndex, endIndex);
        
        let html = '';
        pageData.forEach(request => {
            // 상태 처리 (영어/한글 모두 지원)
            const status = request.status || '';
            const isCompleted = status === 'completed' || status === '거래완료';
            const isPending = status === 'pending' || status === '대기중';
            const isProcessing = status === 'processing' || status === '거래진행중';
            const isCancelled = status === 'cancelled' || status === '취소';
            
            const statusClass = isCompleted ? 'status-completed' :
                              isPending ? 'status-pending' :
                              isProcessing ? 'status-processing' : 'status-cancelled';
            const statusText = isCompleted ? '거래완료' :
                             isPending ? '대기중' :
                             isProcessing ? '거래진행중' : '취소';
            
            const gameId = request.game_id || '-';
            const sellAmount = request.sell_amount || 0;
            const buyAmount = request.buy_amount || 0;
            
            // custom_date가 있으면 그걸 사용, 없으면 created_at 사용
            const displayDate = request.custom_date || formatDate(request.created_at);
            
            html += `
                <tr>
                    <td style="font-size: 0.85rem;">${displayDate}</td>
                    <td>${escapeHtml(request.name)}</td>
                    <td>${request.id_number}</td>
                    <td style="text-align: left; font-weight: 600;">${gameId}</td>
                    <td style="text-align: right; font-weight: 600; color: ${sellAmount > 0 ? 'var(--error-color)' : 'var(--text-secondary)'};">${sellAmount > 0 ? sellAmount.toLocaleString() + '원' : '-'}</td>
                    <td style="text-align: right; font-weight: 600; color: ${buyAmount > 0 ? 'var(--success-color)' : 'var(--text-secondary)'};">${buyAmount > 0 ? buyAmount.toLocaleString() + '원' : '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-edit btn-sm" onclick="openEditRequestModal('${request.id}')" title="수정">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete btn-sm" onclick="deleteTradeRequest('${request.id}')" title="삭제">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // 페이지네이션
        renderPagination('requests-pagination', requestsPage, totalPages, 'changeRequestsPage');
        
    } catch (error) {
        console.error('거래신청 로드 실패:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">거래신청 내역을 불러올 수 없습니다.</td></tr>';
    }
}

// 거래신청 페이지 변경
function changeRequestsPage(page) {
    requestsPage = page;
    loadRequestsTab();
}

// 거래신청 정렬 변경
function changeRequestSort() {
    const selectElement = document.getElementById('request-sort-select');
    requestSortType = selectElement.value;
    requestsPage = 1; // 정렬 변경 시 첫 페이지로 이동
    loadRequestsTab();
}

// 거래신청 수정 모달 열기
let currentEditRequest = null;

async function openEditRequestModal(requestId) {
    try {
        console.log('거래신청 수정 모달 열기:', requestId);
        
        // 거래신청 정보 가져오기
        const response = await fetch(`/tables/trade_requests/${requestId}`);
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }
        
        currentEditRequest = await response.json();
        console.log('불러온 데이터:', currentEditRequest);
        
        // 모달 필드에 값 설정
        document.getElementById('edit-request-id').value = currentEditRequest.id;
        document.getElementById('edit-request-product').value = currentEditRequest.post_title || '';
        document.getElementById('edit-request-name').value = currentEditRequest.name || '';
        document.getElementById('edit-request-id-number').value = currentEditRequest.id_number || '';
        document.getElementById('edit-request-phone').value = currentEditRequest.phone || '';
        document.getElementById('edit-request-amount').value = currentEditRequest.game_id || '';
        document.getElementById('edit-request-sell').value = currentEditRequest.sell_amount || 0;
        document.getElementById('edit-request-buy').value = currentEditRequest.buy_amount || 0;
        document.getElementById('edit-request-status').value = currentEditRequest.status || 'pending';
        
        // 날짜 설정 - custom_date 우선, 없으면 created_at 사용
        let dateToUse;
        if (currentEditRequest.custom_date) {
            // custom_date가 있으면 파싱 (형식: "YYYY-MM-DD HH:MM")
            dateToUse = new Date(currentEditRequest.custom_date.replace(' ', 'T'));
        } else {
            dateToUse = new Date(currentEditRequest.created_at);
        }
        
        const year = dateToUse.getFullYear();
        const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
        const day = String(dateToUse.getDate()).padStart(2, '0');
        const hours = String(dateToUse.getHours()).padStart(2, '0');
        const minutes = String(dateToUse.getMinutes()).padStart(2, '0');
        document.getElementById('edit-request-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // 모달 표시
        const modal = document.getElementById('edit-request-modal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        console.log('모달 표시 완료');
        
    } catch (error) {
        console.error('거래신청 정보 로드 실패:', error);
        showAlert('거래신청 정보를 불러올 수 없습니다.', 'error');
    }
}

// 거래신청 수정 모달 닫기
function closeEditRequestModal() {
    const modal = document.getElementById('edit-request-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('edit-request-form').reset();
    currentEditRequest = null;
}

// 거래신청 삭제
async function deleteTradeRequest(requestId) {
    if (!confirm('이 거래신청을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/tables/trade_requests/${requestId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('거래신청 삭제 실패');
        
        showAlert('거래신청이 삭제되었습니다.', 'success');
        
        // 목록 새로고침
        await loadStats();
        await loadRequestsTab();
        
    } catch (error) {
        console.error('거래신청 삭제 실패:', error);
        showAlert('거래신청 삭제에 실패했습니다.', 'error');
    }
}

// 모든 거래신청 삭제
async function deleteAllTradeRequests() {
    if (!confirm('⚠️ 모든 거래신청 내역을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) return;
    if (!confirm('정말로 삭제하시겠습니까? 다시 한 번 확인해주세요.')) return;
    
    try {
        // 모든 거래신청 가져오기
        const result = await getTradeRequests(1, 10000);
        
        if (result.data.length === 0) {
            showAlert('삭제할 거래신청이 없습니다.', 'info');
            return;
        }
        
        const totalCount = result.data.length;
        let deletedCount = 0;
        let failedCount = 0;
        
        showAlert(`총 ${totalCount}건 삭제 중...`, 'info');
        
        // 각 거래신청 삭제
        for (const request of result.data) {
            try {
                const response = await fetch(`/tables/trade_requests/${request.id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    deletedCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error(`거래신청 ${request.id} 삭제 실패:`, error);
                failedCount++;
            }
            
            // 약간의 딜레이 (서버 부하 방지)
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        if (failedCount === 0) {
            showAlert(`✅ 모든 거래신청 ${deletedCount}건이 삭제되었습니다.`, 'success');
        } else {
            showAlert(`${deletedCount}건 삭제 완료, ${failedCount}건 실패`, 'error');
        }
        
        // 목록 새로고침
        await loadStats();
        await loadRequestsTab();
        
    } catch (error) {
        console.error('모든 거래신청 삭제 실패:', error);
        showAlert('삭제 작업에 실패했습니다.', 'error');
    }
}

// 거래신청 추가 모달 열기
async function openAddRequestModal() {
    try {
        // 운영자 직판장 게시글 목록 가져오기
        const posts = await getPosts('admin_shop', 1, 1000);
        
        const productSelect = document.getElementById('add-request-product');
        productSelect.innerHTML = '<option value="">상품을 선택하세요</option>';
        
        posts.data.forEach(post => {
            const option = document.createElement('option');
            option.value = post.id;
            option.textContent = post.title;
            option.dataset.price = post.price || '0';
            option.dataset.postId = post.id;
            productSelect.appendChild(option);
        });
        
        // 상품 선택 시 금액 자동 설정
        productSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.dataset.price) {
                const priceText = selectedOption.dataset.price;
                const kinaAmount = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                const krwAmount = Math.floor(kinaAmount / 10);
                
                document.getElementById('add-request-amount').value = '';
                document.getElementById('add-request-krw').value = krwAmount;
            }
        });
        
        // 전화번호 자동 하이픈
        document.getElementById('add-request-phone').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 3 && value.length <= 7) {
                value = value.slice(0, 3) + '-' + value.slice(3);
            } else if (value.length > 7) {
                value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
            }
            e.target.value = value;
        });
        
        // 주민번호 입력 제한
        document.getElementById('add-request-id-front').addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
        
        document.getElementById('add-request-id-back').addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
        });
        
        // 기본 날짜를 현재 시간으로 설정
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('add-request-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // 모달 표시
        document.getElementById('add-request-modal').classList.add('show');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('상품 목록 로드 실패:', error);
        showAlert('상품 목록을 불러올 수 없습니다.', 'error');
    }
}

// ✅ 거래신청 추가 모달 닫기 (중복 제거하고 1개만 유지)
function closeAddRequestModal() {
    document.getElementById('add-request-modal').classList.remove('show');
    document.body.style.overflow = '';
    document.getElementById('add-request-form').reset();
}

// 운영자 글쓰기
async function handleAdminWrite(e) {
    e.preventDefault();
    
    // 작성일 입력값 가져오기
    const postDateInput = document.getElementById('admin-post-date').value;
    let postTimestamp;
    
    if (postDateInput) {
        // datetime-local 형식을 timestamp로 변환
        postTimestamp = new Date(postDateInput).getTime();
    } else {
        postTimestamp = Date.now();
    }
    
    const postData = {
        board_type: 'admin_shop',
        title: document.getElementById('admin-title').value.trim(),
        item_name: document.getElementById('admin-item-name').value.trim(),
        price: document.getElementById('admin-price').value.trim(),
        content: document.getElementById('admin-content').value.trim(),
        author: '운영자',
        created_at: postTimestamp,
        updated_at: postTimestamp
    };
    
    if (!postData.title || !postData.item_name || !postData.price || !postData.content) {
        showAlert('모든 항목을 입력해주세요.', 'error');
        return;
    }
    
    try {
        await createPostWithCustomDate(postData);
        showAlert('게시글이 등록되었습니다.', 'success');
        
        // 폼 초기화
        document.getElementById('admin-write-form').reset();
        setDefaultDateTime();
        
        // 통계 및 게시글 목록 새로고침
        await loadStats();
        
        // 게시글 관리 탭으로 전환
        switchTab('posts');
        
    } catch (error) {
        console.error('게시글 등록 실패:', error);
        showAlert('게시글 등록에 실패했습니다.', 'error');
    }
}

// 작성일 기본값 설정
function setDefaultDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('admin-post-date').value = datetimeLocal;
}

// 커스텀 날짜로 게시글 생성
async function createPostWithCustomDate(postData) {
    try {
        // 먼저 게시글 생성 (created_at이 자동 설정됨)
        const createResponse = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...postData,
                views: 0,
                is_admin: true
            })
        });
        
        if (!createResponse.ok) throw new Error('게시글 작성 실패');
        const createdPost = await createResponse.json();
        
        // 생성 직후 PATCH로 created_at 업데이트
        const updateResponse = await fetch(`${API_BASE}/posts/${createdPost.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                created_at: postData.created_at,
                updated_at: postData.updated_at
            })
        });
        
        if (!updateResponse.ok) throw new Error('날짜 업데이트 실패');
        return await updateResponse.json();
    } catch (error) {
        console.error('게시글 작성 실패:', error);
        throw error;
    }
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ------------------------------
// 아래: 엑셀 일괄등록 / 게시글 수정
// (네가 준 코드 그대로, 문법 오류만 없도록 유지)
// ------------------------------

// 엑셀 파일 데이터 저장 변수
let excelData = [];

// 일괄 등록 모달 열기
function openBulkImportModal() {
    document.getElementById('bulk-import-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    document.getElementById('excel-file').value = '';
    document.getElementById('file-name-display').textContent = '선택된 파일 없음';
    document.getElementById('file-name-display').style.color = '#4a90e2';
    document.getElementById('excel-preview').style.display = 'none';
    document.getElementById('excel-upload-btn').disabled = true;
    excelData = [];
}

// 일괄 등록 모달 닫기
function closeBulkImportModal() {
    document.getElementById('bulk-import-modal').style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('excel-file').value = '';
    document.getElementById('file-name-display').textContent = '선택된 파일 없음';
    document.getElementById('file-name-display').style.color = '#4a90e2';
    document.getElementById('excel-preview').style.display = 'none';
    excelData = [];
}

// 엑셀 파일 선택 처리
function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        document.getElementById('file-name-display').textContent = '선택된 파일 없음';
        return;
    }
    
    document.getElementById('file-name-display').textContent = file.name;
    document.getElementById('file-name-display').style.color = '#10b981';
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            parseExcelData(jsonData);
            
        } catch (error) {
            console.error('엑셀 파일 읽기 실패:', error);
            showAlert('엑셀 파일을 읽는데 실패했습니다.', 'error');
            document.getElementById('file-name-display').textContent = '파일 읽기 실패';
            document.getElementById('file-name-display').style.color = '#ef4444';
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 엑셀 데이터 파싱
function parseExcelData(jsonData) {
    excelData = [];
    
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        if (!row || row.length === 0 || !row[0]) continue;
        
        let createdAt;
        if (typeof row[0] === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const excelDate = new Date(excelEpoch.getTime() + row[0] * 86400000);
            createdAt = formatDateForDisplay(excelDate);
        } else if (row[0] instanceof Date) {
            createdAt = formatDateForDisplay(row[0]);
        } else if (typeof row[0] === 'string') {
            createdAt = row[0];
        } else {
            createdAt = formatDateForDisplay(new Date());
        }
        
        const name = row[1] || '';
        const idNumber = String(row[2] || '');
        const gameId = row[3] || '';
        const sellAmount = parseFloat(String(row[4] || '0').replace(/[^0-9.]/g, ''));
        const buyAmount = parseFloat(String(row[5] || '0').replace(/[^0-9.]/g, ''));
        
        excelData.push({
            name,
            id_number: idNumber,
            game_id: gameId,
            sell_amount: sellAmount,
            buy_amount: buyAmount,
            created_at: createdAt,
            phone: '010-0000-0000',
            post_id: 'excel-import',
            post_title: '키나 거래',
            status: 'pending'
        });
    }
    
    displayExcelPreview();
}

// 날짜를 YYYY-MM-DD HH:MM 형식으로 변환
function formatDateForDisplay(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 엑셀 데이터 미리보기 표시
function displayExcelPreview() {
    const previewBody = document.getElementById('excel-preview-body');
    const countInfo = document.getElementById('excel-count-info');
    const uploadBtn = document.getElementById('excel-upload-btn');
    
    if (excelData.length === 0) {
        showAlert('데이터가 없습니다. 엑셀 파일 형식을 확인해주세요.', 'error');
        return;
    }
    
    const previewData = excelData.slice(0, 5);
    
    let html = '';
    previewData.forEach(item => {
        html += `
            <tr>
                <td>${item.created_at}</td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.id_number)}</td>
                <td>${escapeHtml(item.game_id)}</td>
                <td style="text-align: right;">${item.sell_amount > 0 ? item.sell_amount.toLocaleString() + '원' : '-'}</td>
                <td style="text-align: right;">${item.buy_amount > 0 ? item.buy_amount.toLocaleString() + '원' : '-'}</td>
            </tr>
        `;
    });
    
    previewBody.innerHTML = html;
    countInfo.textContent = `총 ${excelData.length}건의 데이터가 준비되었습니다.`;
    
    document.getElementById('excel-preview').style.display = 'block';
    uploadBtn.disabled = false;
}

// 엑셀 데이터 업로드
async function uploadExcelData() {
    if (excelData.length === 0) {
        showAlert('업로드할 데이터가 없습니다.', 'error');
        return;
    }
    
    if (!confirm(`${excelData.length}건의 거래신청을 등록하시겠습니까?`)) return;
    
    const uploadBtn = document.getElementById('excel-upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 등록 중...';
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const data of excelData) {
            try {
                const requestData = {
                    name: data.name,
                    id_number: data.id_number,
                    game_id: data.game_id,
                    phone: data.phone || '010-0000-0000',
                    sell_amount: data.sell_amount || 0,
                    buy_amount: data.buy_amount || 0,
                    post_id: data.post_id || 'excel-import',
                    post_title: data.post_title || '키나 거래',
                    status: 'completed',
                    custom_date: data.created_at
                };
                
                const response = await fetch('/tables/trade_requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                if (!response.ok) throw new Error(`API 응답 오류: ${response.status}`);
                
                successCount++;
            } catch (error) {
                console.error('[실패] 거래신청 생성 실패:', error);
                failCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (successCount > 0) {
            showAlert(`${successCount}건 등록 완료!${failCount > 0 ? ` (실패: ${failCount}건)` : ''}`, 'success');
        } else {
            showAlert('등록에 실패했습니다.', 'error');
        }
        
        closeBulkImportModal();
        switchTab('requests');
        await loadRequestsTab();
        await loadStats();
        
    } catch (error) {
        console.error('일괄 등록 실패:', error);
        showAlert('일괄 등록에 실패했습니다.', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 일괄 등록';
    }
}

// 게시글 수정 모달 열기
async function openEditPostModal(postId) {
    try {
        const response = await fetch(`/tables/posts/${postId}`);
        if (!response.ok) throw new Error('게시글을 불러올 수 없습니다');
        
        const post = await response.json();
        
        document.getElementById('edit-post-id').value = post.id;
        document.getElementById('edit-post-title').value = post.title;
        document.getElementById('edit-post-content').value = post.content;
        
        const date = new Date(post.created_at);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('edit-post-created-date').value = datetimeLocal;
        
        document.getElementById('edit-post-modal').style.display = 'flex';
        
        const form = document.getElementById('edit-post-form');
        form.onsubmit = handleEditPostSubmit;
        
    } catch (error) {
        console.error('게시글 불러오기 실패:', error);
        showAlert('게시글을 불러올 수 없습니다.', 'error');
    }
}

// 게시글 수정 모달 닫기
function closeEditPostModal() {
    document.getElementById('edit-post-modal').style.display = 'none';
    document.getElementById('edit-post-form').reset();
}

// 게시글 수정 제출
async function handleEditPostSubmit(e) {
    e.preventDefault();
    
    const postId = document.getElementById('edit-post-id').value;
    const title = document.getElementById('edit-post-title').value.trim();
    const content = document.getElementById('edit-post-content').value.trim();
    const createdDateInput = document.getElementById('edit-post-created-date').value;
    
    if (!title || !content || !createdDateInput) {
        showAlert('모든 항목을 입력해주세요.', 'error');
        return;
    }
    
    const createdTimestamp = new Date(createdDateInput).getTime();
    
    try {
        const response = await fetch(`/tables/posts/${postId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                content,
                created_at: createdTimestamp,
                updated_at: Date.now()
            })
        });
        
        if (!response.ok) throw new Error('수정 실패');
        
        showAlert('게시글이 수정되었습니다.', 'success');
        closeEditPostModal();
        await loadPostsTab();
        
    } catch (error) {
        console.error('게시글 수정 실패:', error);
        showAlert('게시글 수정에 실패했습니다.', 'error');
    }
}
