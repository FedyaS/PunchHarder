import sevenPlusFont from 'js-pixel-fonts/data/seven-plus.json'

const GAP = [[0]]

function areTouching(first, second) {
  for (let row = 0; row < first.length; row += 1) {
    if (first[row]?.[first[row].length - 1] === 1) {
      for (let offset = -1; offset <= 1; offset += 1) {
        if (second[row + offset]?.[0] === 1) {
          return true
        }
      }
    }
  }

  return false
}

function renderLine(text, font) {
  const characters = []
  let maxHeight = 0

  for (const letter of text.split('')) {
    const glyph = font.glyphs[letter] ?? font.glyphs[letter.toUpperCase()] ?? font.glyphs['']
    const character = []

    glyph.pixels.forEach((row, index) => {
      character[index + glyph.offset] = row
    })

    maxHeight = Math.max(maxHeight, character.length)

    if (
      font.isFixedWidth ||
      (characters.length > 0 && areTouching(characters[characters.length - 1], character))
    ) {
      characters.push(GAP)
    }

    characters.push(character)
  }

  return characters.reduce(
    (rows, character) => {
      const blankRow = Array(character[character.length - 1].length).fill(0)

      for (let row = 0; row < maxHeight; row += 1) {
        rows[row].push(...(character[row] ?? blankRow))
      }

      return rows
    },
    Array(maxHeight)
      .fill(0)
      .map(() => []),
  )
}

function renderPixels(text, font) {
  return text
    .split('\n')
    .flatMap((line, index) => (index === 0 ? renderLine(line, font) : [[0], ...renderLine(line, font)]))
}

const DEFAULT_TEXT = 'PUNCH HARDER'
const DEFAULT_PIXELS = renderPixels(DEFAULT_TEXT, sevenPlusFont)
const DEFAULT_WIDTH = DEFAULT_PIXELS.reduce((max, row) => Math.max(max, row.length), 0)
const DEFAULT_HEIGHT = DEFAULT_PIXELS.length

export function PixelWordmark({ label = 'PunchHarder', className = '' }) {
  return (
    <span className={`block leading-none ${className}`} style={{ aspectRatio: `${DEFAULT_WIDTH} / ${DEFAULT_HEIGHT}` }}>
      <span className="sr-only">{label}</span>
      <svg
        aria-hidden="true"
        className="block h-auto w-full overflow-visible drop-shadow-[0_0_18px_rgba(255,180,162,0.28)]"
        fill="currentColor"
        role="presentation"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${DEFAULT_WIDTH} ${DEFAULT_HEIGHT}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {DEFAULT_PIXELS.flatMap((row, y) =>
          row.map((pixel, x) => (pixel ? <rect height="1" key={`${x}-${y}`} width="1" x={x} y={y} /> : null)),
        )}
      </svg>
    </span>
  )
}
