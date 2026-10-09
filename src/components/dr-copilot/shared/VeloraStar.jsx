import React from "react"

/**
 * Velora's spark, alive.
 *
 * Velora's own four-point spark (the agent-spark mark), moving the way the
 * design team's "star v2" Lottie moves, frame for frame: the large spark
 * turns a quarter on a fast-out curve and holds, and a small one at its
 * shoulder rises and settles while it turns the other way. One cycle is 40
 * frames at 30fps, 1.33 seconds; a quarter turn of a four-point shape lands
 * on itself, so the loop has no seam.
 *
 * Drawn from the spark asset the Velora tile uses rather than played from the
 * Lottie, so the shape and its painted gradient are exactly ours. Used only
 * while an answer is loading; everywhere else the spark is still
 * (VeloraSpark). Reduced motion gets it still too.
 */

/* The Lottie's own easing: out (0.3, 0), in (0.1, 1). */
const EASE = "cubic-bezier(0.3, 0, 0.1, 1)"

const CSS = `
@keyframes velora-spark-big {
  0% { transform: rotate(0deg); animation-timing-function: ${EASE}; }
  50%, 100% { transform: rotate(-90deg); }
}
@keyframes velora-spark-small {
  0% { transform: translateY(0) rotate(0deg); animation-timing-function: ${EASE}; }
  23.1% { transform: translateY(-38%) rotate(55deg); animation-timing-function: ${EASE}; }
  50%, 100% { transform: translateY(0) rotate(90deg); }
}
.velora-spark-big { animation: velora-spark-big 1333ms infinite; transform-origin: 50% 50%; }
.velora-spark-small { animation: velora-spark-small 1333ms infinite; transform-origin: 50% 50%; }
.velora-spark-still .velora-spark-big,
.velora-spark-still .velora-spark-small { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .velora-spark-big, .velora-spark-small { animation: none; }
}
`

/* The spark exactly as the Velora tile draws it: the published asset, whose
   fill is the design team's painted gradient, not an approximation of it. */
const SPARK_SRC = "/icons/dr-agent/agent-spark.svg"

function Spark({ className, style }) {
  return <img src={SPARK_SRC} alt="" aria-hidden="true" draggable={false} className={className} style={style} />
}

export function VeloraStar({ size = 24, playing = true, className, style }) {

  /* The Lottie's composition (a large spark low and left, a small one at its
     upper right shoulder), drawn bigger than the Lottie's 40-in-60. At 22px
     that proportion left a 14px spark with needle tips, which is what read
     as blurred; the large one now fills most of the box. */
  const big = size * 0.82
  const small = size * 0.32

  return (
    <span
      aria-hidden="true"
      className={[playing ? "" : "velora-spark-still", className].filter(Boolean).join(" ")}
      style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0, ...style }}
    >
      <style>{CSS}</style>
      <Spark
        className="velora-spark-big"
        style={{ position: "absolute", width: big, height: big, left: size * 0.02, top: size * 0.16 }}
      />
      <Spark
        className="velora-spark-small"
        style={{
          position: "absolute",
          width: small,
          height: small,
          left: size * 0.82 - small / 2,
          top: size * 0.2 - small / 2,
        }}
      />
    </span>
  )
}

/**
 * The spark at rest, for everywhere that should not move (the top-bar search,
 * the composer field, the mark beside an answer): the same asset the Velora
 * tile in the panel header uses, so every spark in the product is one spark.
 */
export function VeloraSpark({ size = 22, className, style }) {
  return (
    <img
      src={SPARK_SRC}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
      style={{ flexShrink: 0, ...style }}
    />
  )
}
