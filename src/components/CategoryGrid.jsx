import { useRef } from 'react';

export default function CategoryGrid({ categories, selected, onSelect, filter }) {
  const displayCats = filter
    ? categories.filter((c) => c.type === filter || c.type === 'both')
    : categories;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
      }}
    >
      {displayCats.map((cat) => (
        <CatButton
          key={cat.id}
          cat={cat}
          selected={selected === cat.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function CatButton({ cat, selected, onSelect }) {
  const emojiRef = useRef(null);

  function handleClick() {
    if (emojiRef.current) {
      emojiRef.current.classList.remove('anim-bounce-cat');
      void emojiRef.current.offsetWidth;
      emojiRef.current.classList.add('anim-bounce-cat');
      const cleanup = () => emojiRef.current?.classList.remove('anim-bounce-cat');
      emojiRef.current.addEventListener('animationend', cleanup, { once: true });
    }
    onSelect(cat.id);
  }

  return (
    <button
      className={`cat-btn${selected ? ' selected' : ''}`}
      onClick={handleClick}
      type="button"
    >
      <span ref={emojiRef} className="cat-emoji">{cat.emoji}</span>
      <span className="cat-name">{cat.name}</span>
    </button>
  );
}
