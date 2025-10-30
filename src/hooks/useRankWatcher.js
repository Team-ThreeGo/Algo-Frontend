import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useMemberStore } from '@/stores/memberStore'
import { fireConfetti } from '@/utils/confetti'

export function useRankWatcher(memberId) {
  const store = useMemberStore()
  const prevRank = ref(null)
  const showRankUpPopup = ref(false)
  const newRankName = ref('')
  let intervalId = null

  const checkRank = async () => {
    const info = await store.fetchMemberInfo(memberId)
    if (!info) return
    if (prevRank.value && info.rankName !== prevRank.value) {
      // 등급 변화 감지
      newRankName.value = info.rankName
      showRankUpPopup.value = true
      fireConfetti()
      setTimeout(() => (showRankUpPopup.value = false), 360000)
    }
    prevRank.value = info.rankName
  }

  onMounted(async () => {
    await checkRank()
    intervalId = setInterval(checkRank, 3000) // 3초마다 폴링
  })

  onBeforeUnmount(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return {
    showRankUpPopup,
    newRankName,
  }
}
