import confetti from 'canvas-confetti'

export function fireConfetti() {
  confetti({
    particleCount: 200,
    spread: 120,
    startVelocity: 30,
    origin: { y: 0.6 },
  })
}
