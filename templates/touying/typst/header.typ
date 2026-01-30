#let data = json("content.json")

#import "@preview/touying:0.6.1": *

#let themes = {
  import themes: *
  (
    simple: (simple, simple.simple-theme),
    metropolis: (metropolis, metropolis.metropolis-theme),
    dewdrop: (dewdrop, dewdrop.dewdrop-theme),
    aqua: (aqua, aqua.aqua-theme),
    university: (university, university.university-theme),
    stargazer: (stargazer, stargazer.stargazer-theme),
  )
}

#import themes.at(data.theme).at(0): *

#import "@preview/mitex:0.2.5": mi

#let thematic-break = pagebreak()
