#import "./header.typ": *

#let none-if-empty-string(value) = if value == "" { none } else { value }

#set text(font: "Alibaba PuHuiTi 3.0")
#show math.equation: set text(font: "Latin Modern Math")
#show raw: set text(font: "JetBrains Mono")

#show: (
  themes
    .at(data.theme)
    .at(1)
    .with(
      config-info(
        title: none-if-empty-string(data.title),
        subtitle: none-if-empty-string(data.subtitle),
        author: none-if-empty-string(data.author),
        institution: none-if-empty-string(data.institution),
        date: none-if-empty-string(data.date),
      ),
    )
)

#if data.theme == "simple" {
  title-slide({
    if data.title != "" {
      heading(depth: 1, data.title)
    }
    if data.subtitle != "" {
      heading(depth: 2, data.subtitle)
    }
    v(2em)
    if data.author != "" {
      par(data.author)
    }
    if data.institution != "" {
      par(data.institution)
    }
    if data.date != "" {
      par(data.date)
    }
  })
} else {
  title-slide()
}

#include "./extra-body.typ"
