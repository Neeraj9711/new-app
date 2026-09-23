export default function StarRating({ count = 0 }) {
  const stars = Math.max(0, Math.min(5, Number(count) || 0));
  return (
    <span className="star-rating" aria-label={`${stars} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? 'star filled' : 'star'}>★</span>
      ))}
    </span>
  );
}
