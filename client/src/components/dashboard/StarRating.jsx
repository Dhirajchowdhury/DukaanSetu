import { useState } from 'react';
import { FiStar } from 'react-icons/fi';

const StarRating = ({ value = 0, onChange, readonly = false, size = 20 }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = (hover || value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
          >
            <FiStar
              size={size}
              className={filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
