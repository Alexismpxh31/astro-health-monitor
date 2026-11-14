// Avatar letters for crew members (used by the control center and the mission overview).

function nameWords(name = '') {
  return name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
}

/**
 * Avatar letters for each crew member: first + last initial ("Ana Torres" -> "AT").
 * When two members would share them (e.g. "Astronaut Two" / "Astronaut Three"),
 * the first two letters of the last word are used instead ("TW" / "TH").
 */
export function avatarLetters(names) {
  const simple = names.map((name) => {
    const words = nameWords(name)
    return ((words[0]?.[0] ?? '') + (words.length > 1 ? words.at(-1)[0] : '')).toUpperCase()
  })
  return names.map((name, index) =>
    simple.filter((value) => value === simple[index]).length > 1
      ? (nameWords(name).at(-1) ?? '').slice(0, 2).toUpperCase()
      : simple[index],
  )
}
