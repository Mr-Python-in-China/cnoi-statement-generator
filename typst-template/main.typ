#let data = json("data.json")
#let (problems,) = data
#let time = (
  start: datetime(
    year: data.date.start.at(0),
    month: data.date.start.at(1),
    day: data.date.start.at(2),
    hour: data.date.start.at(3),
    minute: data.date.start.at(4),
    second: data.date.start.at(5),
  ),
  end: datetime(
    year: data.date.end.at(0),
    month: data.date.end.at(1),
    day: data.date.end.at(2),
    hour: data.date.end.at(3),
    minute: data.date.end.at(4),
    second: data.date.end.at(5),
  ),
)

#import "@preview/oxifmt:1.0.0": strfmt

#let cjk-align-mark = box(width: 0pt, hide[兔])

#set document(title: data.title)
#set page(paper: "a4", margin: (left: 2.5cm, right: 2.5cm, top: 2.5cm, bottom: 2.5cm))
#set text(lang: "zh", font: ("Latin Modern Roman 12", "SimSun"), size: 12pt)
#set par(first-line-indent: (amount: 2em, all: true), spacing: 0.7em, leading: 0.7em)

// From <https://guide.typst.dev/FAQ/fix-enum-list>
#let correctly-indent-list-and-enum-items(doc) = {
  show list: li => {
    for (i, it) in li.children.enumerate() {
      let nesting = state("list-nesting", 0)
      let indent = context h((nesting.get() + 1) * li.indent)
      let marker = context {
        let n = nesting.get()
        if type(li.marker) == array {
          li.marker.at(calc.rem-euclid(n, li.marker.len()))
        } else if type(li.marker) == content {
          li.marker
        } else {
          li.marker(n)
        }
      }
      let list-fronter = {
        marker
        h(li.body-indent)
      }
      let data = {
        list-fronter
        nesting.update(x => x + 1)
        it.body + parbreak()
        nesting.update(x => x - 1)
      }
      context {
        set par(first-line-indent: 0pt, hanging-indent: measure(list-fronter).width)
        pad(left: li.indent, data)
      }
    }
  }
  show enum: en => {
    let start = if en.start == auto {
      if en.children.first().has("number") {
        if en.reversed { en.children.first().number } else { 1 }
      } else {
        if en.reversed { en.children.len() } else { 1 }
      }
    } else {
      en.start
    }
    let number = start
    for (i, it) in en.children.enumerate() {
      number = if it.has("number") { it.number } else { number }
      if en.reversed { number = start - i }
      let parents = state("enum-parents", ())
      let indent = context h((parents.get().len() + 1) * en.indent)
      let num = if en.full {
        context numbering(en.numbering, ..parents.get(), number)
      } else {
        numbering(en.numbering, number)
      }
      let max-num = if en.full {
        context numbering(en.numbering, ..parents.get(), en.children.len())
      } else {
        numbering(en.numbering, en.children.len())
      }
      num = context box(
        width: measure(max-num).width,
        align(right, text(overhang: false, num)),
      )
      if not en.reversed { number += 1 }
      let enum-fronter = {
        num
        h(en.body-indent)
      }
      let data = {
        enum-fronter
        parents.update(arr => arr + (number,))
        it.body + parbreak()
        parents.update(arr => arr.slice(0, -1))
      }
      context {
        set par(first-line-indent: 0pt, hanging-indent: measure(enum-fronter).width)
        pad(left: en.indent, data)
      }
    }
  }
  doc
}
#show: correctly-indent-list-and-enum-items
#set enum(
  indent: 1.75em,
  numbering: x => numbering("1.", x),
)
#set list(
  indent: 1.75em,
  marker: ([•], [–], [∗], [·]).map(x => x),
)
#show footnote.entry: it => {
  set par(first-line-indent: 0pt)
  pad(
    grid(
      columns: (8pt, 1fr),
      align: (right, left),
      context super(counter(footnote).display(it.note.numbering)), it.note.body,
    ),
    left: it.indent,
    bottom: it.gap,
  )
}

#set raw(tab-size: 4)
#show strong: st => {
  set text(font: ("Latin Modern Roman 12", "SimHei"))
  show regex("\p{sc=Hani}+"): s => {
    underline(s, offset: 3pt, stroke: (
      cap: "round",
      thickness: 0.1em,
      dash: (array: (0em, 1em), phase: 0.5em),
    ))
  }
  st
}
#show heading.where(level: 1): it => {
  set text(size: 18pt, weight: "regular", font: ("Latin Modern Roman 17", "SimHei"))
  set heading(bookmarked: true)
  pad(top: 10pt, align(center, h(2em) + it.body))
}
#show heading.where(level: 2): it => {
  set text(size: 13pt, weight: "regular", font: ("Latin Modern Roman 12", "SimHei"))
  set heading(bookmarked: true)
  pad(left: 1.5em, top: 1em, bottom: .5em, [【] + it.body + [】])
}
#show emph: it => text(font: "Latin Modern Roman", style: "italic", weight: "bold", it.body)
#show raw.where(block: false): it => text(font: ("Consolas", "SimSun"), size: 12pt, it)
#show raw.where(block: true): it => {
  set text(font: ("Consolas", "SimSun"), size: 12pt)
  set par(leading: 0pt, spacing: 0pt)
  set block(above: 10pt, below: 10pt)
  show raw.line: jt => {
    let stroke = (
      left: 0.4pt + rgb("#0000ff"),
      right: 0.4pt + rgb("#0000ff"),
    )
    let inset = (
      top: 8.5pt / 2,
      bottom: 8.5pt / 2,
      left: 3pt,
      right: 3pt,
    )
    if jt.number == 1 {
      stroke.top = 0.4pt + rgb("#0000ff")
      inset.top = 6pt
    }
    if jt.number == jt.count {
      stroke.bottom = 0.4pt + rgb("#0000ff")
      inset.bottom = 9pt
    }
    context (
      box(move(
        dx: 3pt + 6pt,
        box(
          box(
            grid(
              columns: (0pt, 0pt, 100% - 6pt),
              align: (bottom, bottom, bottom),
              move(
                dx: -9pt - measure([#jt.number]).width,
                text(fill: rgb("#808080"), size: 10pt, [#jt.number]),
              ),
              cjk-align-mark,
              jt.body,
            ),
          ),
          stroke: stroke,
          inset: inset,
        ),
      ))
    )
  }
  block(it)
}

#show figure: it => {
  pad(top: 9pt, bottom: 6pt, it)
}
#set figure(numbering: none)

#show math.equation: set text(font: "Latin Modern Math")

#set table(stroke: 0.3pt)

#align(center)[
  #if data.title != "" {
    text(size: 22pt, weight: "bold", font: ("Latin Modern Roman 12", "SimHei"), data.title)
  }

  #if data.subtitle != "" {
    text(size: 22pt, font: ("Latin Modern Roman 17", "SimHei"), data.subtitle)
  }

  #if data.dayname != "" { text(size: 22pt, font: ("Latin Modern Roman 17", "KaiTi"), data.dayname) }

  #if time != none {
    text(
      size: 15pt,
      font: ("Latin Modern Roman 17", "SimHei"),
      "时间："
        + {
          let start_str = strfmt(
            "{}年{}月{}日{:02}:{:02}",
            time.start.year(),
            time.start.month(),
            time.start.day(),
            time.start.hour(),
            time.start.minute(),
          )
          let end_str = strfmt("{:02}:{:02}", time.end.hour(), time.end.minute())
          if time.start.second() != 0 or time.end.second() != 0 {
            start_str += strfmt(":{:02}", time.start.second())
            end_str += strfmt(":{:02}", time.end.second())
          }
          if (
            time.start.year() != time.end.year()
              or time.start.month() != time.end.month()
              or time.start.day() != time.end.day()
          ) {
            end_str = (strfmt("{}年{}月{}日", time.end.year(), time.end.month(), time.end.day()) + end_str)
          }
          start_str + [ $~$ ] + end_str
        },
    )
  }
]

#figure(table(
  columns: (
    if problems.len() >= 4 { 22% } else { 1fr },
    ..for _ in range(0, problems.len()) { (1fr,) },
  ),
  align: left + bottom,
  [题目名称],
  ..for i in problems { (i.title,) },
  [题目类型],
  ..for i in problems { (i.type,) },
  ..if data.noi_style {
    (
      [目录],
      ..for i in problems { (raw(i.dir),) },
      [可执行文件名],
      ..for i in problems { (raw(i.exec),) },
    )
  },
  ..if data.file_io {
    (
      [输入文件名],
      ..for i in problems { (raw(i.input),) },
      [输出文件名],
      ..for i in problems { (raw(i.output),) },
    )
  },
  [每个测试点时限],
  ..for i in problems { (i.time_limit,) },
  [内存限制],
  ..for i in problems { (i.memory_limit,) },
  if data.noi_style { [测试点数目] } else { [子任务数目] },
  ..for i in problems { (i.testcase,) },
  ..if data.noi_style {
    (
      [测试点是否等分 ],
      ..for i in problems { (i.point_equal,) },
    )
  },
  ..if data.use_pretest {
    ([预测试点数目], ..for i in problems { (i.pretestcase,) })
  },
))

#let calc_language_name_content(c) = {
  let w = 36pt
  if measure(c).width <= w {
    c + h(w - measure(c).width)
  } else { c }
}

#if data.noi_style {
  [
    提交源程序文件名
    #figure(table(
      columns: (
        if problems.len() >= 4 { 22% } else { 1fr },
        ..for _ in range(0, problems.len()) { (1fr,) },
      ),
      align: left + bottom,
      ..for i in range(0, data.support_languages.len()) {
        (
          [对于#context calc_language_name_content(data.support_languages.at(i).name)语言],
          ..for j in problems {
            (raw(j.submit_filename.at(i)),)
          },
        )
      }
    ))
  ]
}

编译选项
#figure(table(
  columns: (
    if problems.len() >= 4 { 22% } else { 1fr },
    ..for _ in range(0, problems.len()) { (1fr,) },
  ),
  align: (left + bottom, center + bottom),
  ..for lang in data.support_languages {
    (
      [对于#context calc_language_name_content(lang.name)语言],
      ..if (problems.len() > 0) { (table.cell(colspan: problems.len(), raw(lang.compile_options)),) },
    )
  },
))


#set table(
  stroke: (x, y) => (
    left: if x > 0 { .4pt },
    bottom: 2pt,
    top: if y == 0 { 2pt } else if y == 1 { 1.2pt } else { .4pt },
  ),
  align: center + horizon,
)

#include "precaution.typ"

#let current-problem-idx = counter("current-problem-idx")

#set page(
  header: context {
    let prob = problems.at(current-problem-idx.get().at(0))
    set par(first-line-indent: 0em)
    [
      #text(size: 10pt, font: ("Latin Modern Roman", "SimSun"))[
        #data.title
        #data.subtitle
        #h(1fr)
        #data.dayname
        #prob.title（#prob.name）
      ]
      #v(-4pt)
      #line(length: 100%, stroke: 0.3pt)
    ]
  },
  numbering: (now, total) => [#text(
    size: 10pt,
  )[第 #(now) 页 ~~~~ 共 #link((page: total, x: 2.5cm, y: 1.5cm))[#text(fill: rgb("#0000ff"))[#(total)]] 页]],
)

#for (i, p) in problems.enumerate() {
  pagebreak()
  heading(level: 1, [#p.title（#p.name）])
  include "problem-" + str(i) + ".typ"
  current-problem-idx.step()
}
