// 관리자용 RESTful Table API 함수들

// 거래신청 목록 조회
async function getTradeRequests(page = 1, limit = 1000) {
    try {
        const response = await fetch(`tables/trade_requests?page=${page}&limit=${limit}`);
        
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

// getPosts 함수 (main.js와 동일)
async function getPosts(boardType, page = 1, limit = 15, searchTerm = '') {
    try {
        let url = `tables/posts?page=${page}&limit=${limit}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('API 오류');
        
        const result = await response.json();
        let data = result.data || [];
        
        // 클라이언트 사이드 필터링
        if (boardType && boardType !== 'all') {
            data = data.filter(post => post.board_type === boardType);
        }
        
        if (searchTerm) {
            data = data.filter(post => 
                post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.content?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return {
            data: data,
            total: data.length,
            page: page,
            limit: limit
        };
    } catch (error) {
        console.error('게시글 조회 오류:', error);
        return { data: [], total: 0, page: 1, limit: limit };
    }
}
