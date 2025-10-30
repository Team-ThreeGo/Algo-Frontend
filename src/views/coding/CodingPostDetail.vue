<template>
  <div class="solution-detail-page">
    <!-- 문제 정보 배너 -->
    <div class="problem-banner">
      <span class="banner-label">
        <span class="problem-name">{{ problemTitle }}</span>에 대한 코딩풀이
      </span>
    </div>

    <!-- 뒤로가기 -->
    <BackButton text="목록으로 돌아가기" :to="`/coding-problems/${problemId}/solutions/`" />

    <!-- 게시물 헤더 -->
    <div class="post-header">
      <h1 class="post-title">{{ postTitle }}</h1>
      <MiniProfile :nickname="nickname" :rankName="memberRank" />
      <span class="post-date">{{ createdAt }}</span>
    </div>

    <!-- 게시물 내용 -->
    <div class="post-content-section">
      <div v-html="postContent" class="post-content"></div>
    </div>

    <!-- AI 피드백 섹션 -->
    <div class="ai-feedback-section">
      <h2 class="section-title">AI 피드백</h2>

      <!-- AI 피드백 로딩 중 -->
      <div v-if="isAiLoading" class="ai-loading">
        <div class="loading-spinner">
          <el-icon class="is-loading" :size="60" color="#0AA2EB">
            <Loading />
          </el-icon>
        </div>
        <p class="loading-text">
          AI가 풀이를 열심히 분석하고 있어요 🤖<br />
          조금만 기다려주세요, 곧 피드백을 드릴게요!
        </p>
      </div>

      <!-- AI 피드백 완료 -->
      <div v-else class="ai-feedback-content">
        <!-- 시간 복잡도 -->
        <div class="feedback-card">
          <div class="card-header">
            <h3>⏱️ 시간 복잡도</h3>
          </div>
          <div class="card-content">
            <p class="big-o-badge">{{ aiBigO || '분석 중...' }}</p>
          </div>
        </div>

        <!-- 잘한 점 -->
        <div class="feedback-card good">
          <div class="card-header">
            <h3>👍 잘한 점</h3>
          </div>
          <div class="card-content">
            <ul v-if="aiGood.length > 0">
              <li v-for="(item, index) in aiGood" :key="index">{{ item }}</li>
            </ul>
            <p v-else>아직 피드백이 없습니다.</p>
          </div>
        </div>

        <!-- 개선할 점 -->
        <div class="feedback-card bad">
          <div class="card-header">
            <h3>💡 개선할 점</h3>
          </div>
          <div class="card-content">
            <ul v-if="aiBad.length > 0">
              <li v-for="(item, index) in aiBad" :key="index">{{ item }}</li>
            </ul>
            <p v-else>아직 피드백이 없습니다.</p>
          </div>
        </div>

        <!-- 개선 방향 -->
        <div class="feedback-card plan">
          <div class="card-header">
            <h3>🚀 개선 방향</h3>
          </div>
          <div class="card-content">
            <p>{{ aiPlan || '아직 피드백이 없습니다.' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 오른쪽 사이드바 -->
    <div class="right-sidebar">
      <!-- 다른 풀이 목록 -->
      <div class="other-solutions">
        <h3 class="sidebar-title">
          더 많은 <span class="highlight">{{ problemTitle }}</span> 풀이글 보기
        </h3>

        <div class="solution-list" v-if="otherSolutions.length > 0">
          <PostListItem v-for="solution in otherSolutions" :key="solution.postId" :id="solution.postId"
            :title="solution.postTitle" :nickname="solution.nickname" :rankName="solution.memberRank"
            :createdAt="solution.createdAt" :likeCount="solution.likeCount" :commentCount="solution.commentCount"
            @click="handleSolutionClick(solution.postId)" />
        </div>
        <p v-else class="no-solutions-text">다른 풀이가 없습니다.</p>
      </div>

      <!-- AI 피드백 요청 카드 -->
      <div class="ai-request-card">
        <div class="koala-background"></div>
        <CustomButton variant="primary" height="md" width="100%" class="action-button" @click="handleWriteSolution">
          풀이글 작성하러 가기
        </CustomButton>
      </div>
    </div>

    <!-- 댓글 섹션 -->
    <div class="comment-wrapper">
      <Comment :comments="comments" :currentUser="currentUser" @submit-comment="handleSubmitComment"
        @submit-reply="handleSubmitReply" @edit-comment="handleEditComment" @delete-comment="handleDeleteComment"
        @edit-reply="handleEditReply" @delete-reply="handleDeleteReply" @report-comment="handleReportComment"
        @report-reply="handleReportReply" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import coreApi from '@/api/coreApi'

import BackButton from '@/components/common/BackButton.vue'
import MiniProfile from '@/components/common/MiniProfile.vue'
import CustomButton from '@/components/common/CustomButton.vue'
import PostListItem from '@/components/common/PostListItem.vue'
import Comment from '@/components/common/Comment.vue'
import { param } from 'jquery'

// 라우터
const route = useRoute()
const router = useRouter()
const problemId = Number(route.params.problemId)
const solutionId = ref(Number(route.params.solutionId))

// 상태값
const postDetail = ref(null)
const comments = ref([])
const otherSolutions = ref([])
const isAiLoading = ref(true)

const currentUser = ref({ nickname: '', rankName: '' })

// Computed
const problemTitle = computed(() => postDetail.value?.problemTitle || '문제 제목')
const postTitle = computed(() => postDetail.value?.postTitle || '')
const postContent = computed(() => postDetail.value?.postContent || '')
const nickname = computed(() => postDetail.value?.nickname || '')
const memberRank = computed(() => postDetail.value?.memberRank || '')
const createdAt = computed(() => postDetail.value?.createdAt || '')
const commentCount = computed(() => postDetail.value?.commentCount || 0)
const aiBigO = computed(() => postDetail.value?.aiBigO || '')
const aiPlan = computed(() => postDetail.value?.aiPlan || '')
const aiGood = computed(() => {
  const raw = postDetail.value?.aiGood
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return raw.split(',').map(i => i.trim()) }
})
const aiBad = computed(() => {
  const raw = postDetail.value?.aiBad
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return raw.split(',').map(i => i.trim()) }
})

// API: 게시물 상세 조회
const fetchPostDetail = async () => {
  try {
    const name = localStorage.getItem('nickname');
    const rank = localStorage.getItem('rank');

    currentUser.value = {
      nickname: name,
      rankName: rank
    };
    const { data } = await coreApi.get(`/coding/posts/${solutionId.value}`)
    postDetail.value = data
    if (data.aiBigO) {
      isAiLoading.value = false
    } else {
      startAiPolling()
    }
  } catch (err) {
    console.error('❌ 게시물 상세 조회 실패:', err)
    alert('게시물을 불러올 수 없습니다.')
  }
}

// API: AI 피드백 폴링
const startAiPolling = () => {
  const interval = setInterval(async () => {
    try {
      const { data } = await coreApi.get(`/coding/posts/${solutionId.value}`)
      if (data.aiBigO) {
        postDetail.value = data
        isAiLoading.value = false
        clearInterval(interval)
      }
    } catch { }
  }, 5000)

  setTimeout(() => clearInterval(interval), 120000)
}

/* 이벤트 */
const handleWriteSolution = () => {
  if (!problemTitle.value) {
    alert('문제 정보를 불러오는 중입니다.')
    return
  }

  router.push({
    path: `/coding-problems/${problemId}/solutions/new`,
    query: {
      problemTitle: problemTitle.value, // 제목도 전달 가능
    },
  })
}

// API: 댓글 조회
const fetchComments = async () => {
  try {

    const { data } = await coreApi.get(`/coding/posts/${solutionId.value}/comments`)

    console.log(data);
    const normalize = (nodes = []) =>
      nodes.map((n) => ({
        id: n.commentId,
        parentCommentId: n.parentId,
        memberId: n.memberId,
        memberNickname: n.nickname,
        memberRank: n.memberRank,
        content: n.content,
        createdAt: n.createdAt,
        visibility: n.visibility,
        childComments: n.children ? normalize(n.children) : [],
      }));
    comments.value = normalize(data);
  } catch (err) {
    console.error('댓글 조회 실패:', err)
  }
}

const transformCommentsForUI = (backendComments) =>
  backendComments.map(c => ({
    id: c.commentId,
    userId: c.memberId,
    nickname: c.nickname,
    rankName: c.memberRank,
    content: c.content,
    createdAt: c.createdAt,
    visibility: c.visibility,
    replies: c.children?.map(r => ({
      id: r.commentId,
      userId: r.memberId,
      nickname: r.nickname,
      rankName: r.memberRank,
      content: r.content,
      createdAt: r.createdAt,
    })) || [],
  }))

// API: 같은 문제 다른 풀이 조회
const fetchOtherSolutions = async () => {
  try {
    const { data } = await coreApi.get(`/coding-problem/${problemId}/posts`, {
      params: { page: 0, size: 4 },
    })
    otherSolutions.value = (data || []).filter(p => p.postId !== solutionId.value).slice(0, 3)
  } catch (err) {
    console.error('❌ 다른 풀이 조회 실패:', err)
  }
}

// 댓글 핸들러
const handleSubmitComment = async (data) => {
  await coreApi.post(`/coding/posts/${solutionId.value}/comments`, { content: data.content })
  await fetchComments()
  await fetchPostDetail()
}

const handleSubmitReply = async (data) => {
  await coreApi.post(
    `/coding/posts/${solutionId.value}/comments`,
    { content: data.content },
    { params: { parentId: data.commentId } }
  )
  await fetchComments()
  await fetchPostDetail()
}

const handleEditComment = async (data) => {
  await coreApi.put(`/coding/comments/${data.commentId}`, { content: data.content })
  await fetchComments()
}

const handleDeleteComment = async (commentId) => {
  await coreApi.delete(`/coding/comments/${commentId}`)
  await fetchComments()
  await fetchPostDetail()
}

const handleEditReply = async (data) => {
  console.log(data);
  await coreApi.put(`/coding/comments/${data.replyId}`, { content: data.content })
  await fetchComments()
}

const handleDeleteReply = async (data) => {
  await coreApi.delete(`/coding/comments/${data.replyId}`)
  await fetchComments()
  await fetchPostDetail()
}

// UI 이벤트
const handleSolutionClick = (id) => {
  router.push(`/coding-problems/${problemId}/solutions/${id}`)
}

// 🔹 route param 변경 감지 (같은 컴포넌트 재사용 시)
onBeforeRouteUpdate(async (to, from, next) => {
  console.log('라우트 변경 감지:', from.params.solutionId, '→', to.params.solutionId)
  solutionId.value = Number(to.params.solutionId)
  postDetail.value = null
  comments.value = []
  otherSolutions.value = []
  await fetchPostDetail()
  await fetchComments()
  await fetchOtherSolutions()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  next()
})

// Lifecycle: 최초 데이터 로딩
onMounted(async () => {
  await fetchPostDetail()
  await fetchComments()
  await fetchOtherSolutions()
})
</script>

<style scoped>
.solution-detail-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
  font-family: 'Noto Sans KR', sans-serif;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 40px;
  position: relative;
}

.solution-detail-page>*:not(.right-sidebar) {
  grid-column: 1;
}

.right-sidebar {
  grid-column: 2;
  grid-row: 1 / span 10;
}

.problem-banner {
  margin: 24px 0 16px;
}

.banner-label {
  font-size: 20px;
  font-weight: 400;
  color: #606266;
  line-height: 1.5;
}

.problem-name {
  color: #0AA2EB;
  font-weight: 600;
}

.post-header {
  margin: 32px 0;
}

.post-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 16px;
  line-height: 1.4;
}

.post-date {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
}

.post-content-section {
  background: #fff;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 40px;
  min-height: 400px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
}

.post-content pre {
  background: #F5F7FA;
  border: 1px solid #DCDFE6;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 16px 0;
}

.post-content code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #E83E8C;
}

.post-content pre code {
  color: #303133;
}

.ai-feedback-section {
  background: #fff;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 40px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 24px;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 20px;
}

.loading-spinner {
  margin-bottom: 0;
}

.loading-text {
  font-size: 16px;
  color: #606266;
  text-align: center;
  line-height: 1.6;
}

.ai-feedback-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feedback-card {
  background: #F8F9FA;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 20px;
}

.feedback-card.good {
  background: #F0F9FF;
  border-color: #BAE7FF;
}

.feedback-card.bad {
  background: #FFF7E6;
  border-color: #FFD591;
}

.feedback-card.plan {
  background: #F6FFED;
  border-color: #B7EB8F;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.card-content {
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
}

.big-o-badge {
  display: inline-block;
  background: #0AA2EB;
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
}

.card-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.card-content li {
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
}

.card-content li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #0AA2EB;
  font-weight: 700;
}

.right-sidebar {
  position: sticky;
  top: 24px;
  height: fit-content;
}

.other-solutions {
  background: #fff;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.highlight {
  color: #0AA2EB;
}

.solution-list {
  display: flex;
  flex-direction: column;
}

.no-solutions-text {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 20px 0;
}

.ai-request-card {
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  min-height: 300px;
  overflow: hidden;
}

.koala-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/images/coding_feedback.png');
  background-size: 70%;
  background-position: center 20px;
  background-repeat: no-repeat;
  z-index: 0;
}

.action-button {
  position: relative;
  z-index: 1;
}

.comment-wrapper {
  grid-column: 1 / -1;
  background: #fff;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 32px;
  margin-top: 40px;
}

@media (max-width: 1200px) {
  .solution-detail-page {
    grid-template-columns: 1fr;
  }

  .right-sidebar {
    grid-column: 1;
    grid-row: auto;
    position: static;
  }

  .comment-wrapper {
    grid-column: 1;
  }
}

@media (max-width: 768px) {
  .post-title {
    font-size: 22px;
  }

  .post-content-section {
    padding: 20px;
  }

  .ai-feedback-section {
    padding: 20px;
  }

  .comment-wrapper {
    padding: 20px;
  }
}
</style>