// 관리자 대시보드 스크립트

const API = '/tables';

// 공통 fetch helper
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API 오류: ${res.status} ${text}`);
  }
  // DELETE 등 body 없는 응답 대비
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

// ===== API 함수들 =====
async function getTradeRequests(page = 1, limit = 1000) {
  try {
    const result = await apiFetch(`/trade_requests?page=${page}&limit=${limit}`);
    return {
      data: result?.data || [],
      total: result?.total || 0,
      page: result?.page || page,
      limit: result?.limit || limit
    };
  } catch (error) {
    console.error('거래신청 조회 오류:', error);
    return { data: [], total: 0, page: 1, limit };
  }
}
// ===== API 함수 끝 =====

let currentTab = 'posts';
let postsPage = 1;
let requestsPage = 1;
const itemsPerPage = 20;
let boardFilter = 'all';
let postSearchQuery = '';
let requestSortType = 'date-desc';

document.addEventListener('DOMContentLoaded', async () => {
  // 관리자 인증 확인
  if (typeof isAdmin === 'function' && !isAdmin()) {
    alert('관리자 권한이 필요합니다.');
    window.location.href = 'admin-login.html';
    return;
  }

  await loadStats();
  await loadPostsTab();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('로그아웃 하시겠습니까?')) {
        if (typeof logoutAdmin === 'function') logoutAdmin();
      }
    });
  }

  const boardFilterEl = document.getElementById('board-filter');
  if (boardFilterEl) {
    boardFilterEl.addEventListener('change', (e) => {
      boardFilter = e.target.value;
      postsPage = 1;
      loadPostsTab();
    });
  }

  const postSearchEl = document.getElementById('post-search');
  if (postSearchEl) {
    postSearchEl.addEventListener('input', (e) => {
      postSearchQuery = e.target.value.trim();
      postsPage = 1;
      loadPostsTab();
    });
  }

  const adminWriteForm = document.getElementById('admin-write-form');
  if (adminWriteForm) {
    adminWriteForm.addEventListener('submit', handleAdminWrite);
    adminWriteForm.addEventListener('reset', () => setTimeout(setDefaultDateTime, 10));
    setDefaultDateTime();
  }

  // 거래신청 수정 폼
  const editForm = document.getElementById('edit-request-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const requestId = document.getElementById('edit-request-id').value;
      const dateInput = document.getElementById('edit-request-date').value;

      const selectedDate = new Date(dateInput);
      const customDateStr =
        `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` +
        ` ${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`;

      const updateData = {
        post_title: document.getElementById('edit-request-product').value.trim(),
        name: document.getElementById('edit-request-name').value.trim(),
        id_number: document.getElementById('edit-request-id-number').value.trim(),
        phone: document.getElementById('edit-request-phone').value.trim(),
        game_id: document.getElementById('edit-request-amount').value.trim(),
        sell_amount: parseInt(document.getElementById('edit-request-sell').value) || 0,
        buy_amount: parseInt(document.getElementById('edit-request-buy').value) || 0,
        status: document.getElementById('edit-request-status').value,
        custom_date: customDateStr
      };

      try {
        await apiFetch(`/trade_requests/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (typeof showAlert === 'function') showAlert('거래신청 정보가 수정되었습니다.', 'success');
        closeEditRequestModal();

        await loadStats();
        await loadRequestsTab();
      } catch (error) {
        console.error('거래신청 수정 실패:', error);
        if (typeof showAlert === 'function') showAlert('거래신청 수정에 실패했습니다.', 'error');
      }
    });
  }

  // 거래신청 추가 폼
  const addForm = document.getElementById('add-request-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const productSelect = document.getElementById('add-request-product');
      const selectedOption = productSelect.options[productSelect.selectedIndex];

      if (!selectedOption.value) {
        if (typeof showAlert === 'function') showAlert('상품을 선택해주세요.', 'error');
        return;
      }

      const dateInput = document.getElementById('add-request-date').value;
      const idFront = document.getElementById('add-request-id-front').value.trim();
      const idBack = document.getElementById('add-request-id-back').value.trim();

      if (idFront.length !== 6 || idBack.length !== 1) {
        if (typeof showAlert === 'function') showAlert('주민등록번호를 정확히 입력해주세요.', 'error');
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
        custom_date: dateInput
      };

      try {
        await apiFetch(`/trade_requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        if (typeof showAlert === 'function') showAlert('거래신청이 추가되었습니다.', 'success');
        closeAddRequestModal();

        await loadStats();
        await loadRequestsTab();
      } catch (error) {
        console.error('거래신청 추가 실패:', error);
        if (typeof showAlert === 'function') showAlert('거래신청 추가에 실패했습니다.', 'error');
      }
    });
  }
});

// 통계 로드
async function loadStats() {
  try {
    // getPosts, getBoardName, formatDate 등은 기존 파일에 있다고 가정
    const allPosts = await getPosts('all', 1, 10000);

    const freeCount = allPosts.data.filter(p => p.board_type === 'free').length;
    const tradeCount = allPosts.data.filter(p => p.board_type === 'trade').length;
    const adminShopCount = allPosts.data.filter(p => p.board_type === 'admin_shop').length;

    const requestsData = await apiFetch(`/trade_requests?page=1&limit=10000`);
    const requestCount = (requestsData?.data || []).length;

    const membersData = await apiFetch(`/members?page=1&limit=10000`);
    const memberCount = (membersData?.data || []).length;
    const pendingCount = (membersData?.data || []).filter(m => m.status === 'pending').length;

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

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  const tabEl = document.getElementById(`${tabName}-tab`);
  if (tabEl) tabEl.classList.add('active');

  if (tabName === 'posts') loadPostsTab();
  if (tabName === 'requests') loadRequestsTab();
}

// 게시글 관리 탭 로드
async function loadPostsTab() {
  const tbody = document.getElementById('admin-post-list');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">게시글을 불러오는 중...</td></tr>';

  try {
    const result = await getPosts(boardFilter, postsPage, itemsPerPage, postSearchQuery);

    if (!result.data.length) {
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
    if (typeof showAlert === 'function') showAlert('게시글이 삭제되었습니다.', 'success');
    await loadStats();
    await loadPostsTab();
  } catch (error) {
    console.error('삭제 실패:', error);
    if (typeof showAlert === 'function') showAlert('삭제에 실패했습니다.', 'error');
  }
}

function changePostsPage(page) {
  postsPage = page;
  loadPostsTab();
}

// 거래신청 내역 탭 로드
async function loadRequestsTab() {
  const tbody = document.getElementById('request-list');
  tbody.innerHTML = '<tr><td colspan="8" class="loading">거래신청 내역을 불러오는 중...</td></tr>';

  try {
    const result = await getTradeRequests(1, 1000);

    if (!result.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data">거래신청 내역이 없습니다.</td></tr>';
      document.getElementById('requests-pagination').innerHTML = '';
      return;
    }

    let sortedData = [...result.data];

    if (requestSortType === 'date-desc') {
      sortedData.sort((a, b) => {
        const dateA = a.custom_date ? new Date(a.custom_date.replace(' ', 'T')) : new Date(a.created_at);
        const dateB = b.custom_date ? new Date(b.custom_date.replace(' ', 'T')) : new Date(b.created_at);
        return dateB - dateA;
      });
    } else if (requestSortType === 'date-asc') {
      sortedData.sort((a, b) => {
        const dateA = a.custom_date ? new Date(a.custom_date.replace(' ', 'T')) : new Date(a.created_at);
        const dateB = b.custom_date ? new Date(b.custom_date.replace(' ', 'T')) : new Date(b.created_at);
        return dateA - dateB;
      });
    } else if (requestSortType === 'name-asc') {
      sortedData.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } else if (requestSortType === 'name-desc') {
      sortedData.sort((a, b) => b.name.localeCompare(a.name, 'ko'));
    }

    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (requestsPage - 1) * itemsPerPage;
    const pageData = sortedData.slice(startIndex, startIndex + itemsPerPage);

    let html = '';
    pageData.forEach(request => {
      const status = request.status || '';
      const isCompleted = status === 'completed' || status === '거래완료';
      const isPending = status === 'pending' || status === '대기중';
      const isProcessing = status === 'processing' || status === '거래진행중';

      const statusClass = isCompleted ? 'status-completed' :
        isPending ? 'status-pending' :
        isProcessing ? 'status-processing' : 'status-cancelled';

      const statusText = isCompleted ? '거래완료' :
        isPending ? '대기중' :
        isProcessing ? '거래진행중' : '취소';

      const sellAmount = request.sell_amount || 0;
      const buyAmount = request.buy_amount || 0;
      const displayDate = request.custom_date || formatDate(request.created_at);

      html += `
        <tr>
          <td style="font-size: 0.85rem;">${displayDate}</td>
          <td>${escapeHtml(request.name)}</td>
          <td>${request.id_number}</td>
          <td style="text-align: left; font-weight: 600;">${request.game_id || '-'}</td>
          <td style="text-align: right; font-weight: 600; color: ${sellAmount > 0 ? 'var(--error-color)' : 'var(--text-secondary)'};">
            ${sellAmount > 0 ? sellAmount.toLocaleString() + '원' : '-'}
          </td>
          <td style="text-align: right; font-weight: 600; color: ${buyAmount > 0 ? 'var(--success-color)' : 'var(--text-secondary)'};">
            ${buyAmount > 0 ? buyAmount.toLocaleString() + '원' : '-'}
          </td>
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
    renderPagination('requests-pagination', requestsPage, totalPages, 'changeRequestsPage');
  } catch (error) {
    console.error('거래신청 로드 실패:', error);
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">거래신청 내역을 불러올 수 없습니다.</td></tr>';
  }
}

function changeRequestsPage(page) {
  requestsPage = page;
  loadRequestsTab();
}

function changeRequestSort() {
  const selectElement = document.getElementById('request-sort-select');
  requestSortType = selectElement.value;
  requestsPage = 1;
  loadRequestsTab();
}

let currentEditRequest = null;

async function openEditRequestModal(requestId) {
  try {
    currentEditRequest = await apiFetch(`/trade_requests/${requestId}`);

    document.getElementById('edit-request-id').value = currentEditRequest.id;
    document.getElementById('edit-request-product').value = currentEditRequest.post_title || '';
    document.getElementById('edit-request-name').value = currentEditRequest.name || '';
    document.getElementById('edit-request-id-number').value = currentEditRequest.id_number || '';
    document.getElementById('edit-request-phone').value = currentEditRequest.phone || '';
    document.getElementById('edit-request-amount').value = currentEditRequest.game_id || '';
    document.getElementById('edit-request-sell').value = currentEditRequest.sell_amount || 0;
    document.getElementById('edit-request-buy').value = currentEditRequest.buy_amount || 0;
    document.getElementById('edit-request-status').value = currentEditRequest.status || 'pending';

    let dateToUse = currentEditRequest.custom_date
      ? new Date(currentEditRequest.custom_date.replace(' ', 'T'))
      : new Date(currentEditRequest.created_at);

    const year = dateToUse.getFullYear();
    const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const day = String(dateToUse.getDate()).padStart(2, '0');
    const hours = String(dateToUse.getHours()).padStart(2, '0');
    const minutes = String(dateToUse.getMinutes()).padStart(2, '0');
    document.getElementById('edit-request-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;

    const modal = document.getElementById('edit-request-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('거래신청 정보 로드 실패:', error);
    if (typeof showAlert === 'function') showAlert('거래신청 정보를 불러올 수 없습니다.', 'error');
  }
}

function closeEditRequestModal() {
  const modal = document.getElementById('edit-request-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('edit-request-form').reset();
  currentEditRequest = null;
}

async function deleteTradeRequest(requestId) {
  if (!confirm('이 거래신청을 삭제하시겠습니까?')) return;

  try {
    await apiFetch(`/trade_requests/${requestId}`, { method: 'DELETE' });
    if (typeof showAlert === 'function') showAlert('거래신청이 삭제되었습니다.', 'success');
    await loadStats();
    await loadRequestsTab();
  } catch (error) {
    console.error('거래신청 삭제 실패:', error);
    if (typeof showAlert === 'function') showAlert('거래신청 삭제에 실패했습니다.', 'error');
  }
}

// ✅✅✅ 여기가 핵심: deleteAllTradeRequests 끝난 뒤에 끼어있던 "깨진 조각" 제거됨
async function deleteAllTradeRequests() {
  if (!confirm('⚠️ 모든 거래신청 내역을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) return;
  if (!confirm('정말로 삭제하시겠습니까? 다시 한 번 확인해주세요.')) return;

  try {
    const result = await getTradeRequests(1, 10000);

    if (!result.data.length) {
      if (typeof showAlert === 'function') showAlert('삭제할 거래신청이 없습니다.', 'info');
      return;
    }

    const totalCount = result.data.length;
    let deletedCount = 0;
    let failedCount = 0;

    if (typeof showAlert === 'function') showAlert(`총 ${totalCount}건 삭제 중...`, 'info');

    for (const request of result.data) {
      try {
        await apiFetch(`/trade_requests/${request.id}`, { method: 'DELETE' });
        deletedCount++;
      } catch (e) {
        failedCount++;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    if (typeof showAlert === 'function') {
      if (failedCount === 0) showAlert(`✅ 모든 거래신청 ${deletedCount}건이 삭제되었습니다.`, 'success');
      else showAlert(`${deletedCount}건 삭제 완료, ${failedCount}건 실패`, 'error');
    }

    await loadStats();
    await loadRequestsTab();
  } catch (error) {
    console.error('모든 거래신청 삭제 실패:', error);
    if (typeof showAlert === 'function') showAlert('삭제 작업에 실패했습니다.', 'error');
  }
}

// 거래신청 추가 모달 닫기 (중복 제거: 하나만 남김)
function closeAddRequestModal() {
  document.getElementById('add-request-modal').classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('add-request-form').reset();
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// 작성일 기본값 설정
function setDefaultDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('admin-post-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 운영자 글쓰기 (원래 네 로직 유지, 단 API_BASE 혼용이면 여기서도 /tables/posts 쓰도록 맞춰야 함)
async function handleAdminWrite(e) {
  e.preventDefault();

  const postDateInput = document.getElementById('admin-post-date').value;
  const postTimestamp = postDateInput ? new Date(postDateInput).getTime() : Date.now();

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
    if (typeof showAlert === 'function') showAlert('모든 항목을 입력해주세요.', 'error');
    return;
  }

  try {
    // posts 생성/수정 함수는 네 기존 구현을 쓰되 endpoint는 /tables/posts로 통일 추천
    await createPostWithCustomDate(postData);
    if (typeof showAlert === 'function') showAlert('게시글이 등록되었습니다.', 'success');

    document.getElementById('admin-write-form').reset();
    setDefaultDateTime();

    await loadStats();
    switchTab('posts');
  } catch (error) {
    console.error('게시글 등록 실패:', error);
    if (typeof showAlert === 'function') showAlert('게시글 등록에 실패했습니다.', 'error');
  }
}
