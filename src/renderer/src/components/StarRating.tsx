import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number // 0-5
  onChange?: (v: number) => void
  size?: number
}

export function StarRating({ value, onChange, size = 14 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
          title={`${n} 星`}
        >
          <Star
            size={size}
            className={
              n <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-neutral-600'
            }
          />
        </button>
      ))}
    </div>
  )
}
