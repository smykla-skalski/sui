# Each open pull request from `gh pr list --json number,title`, as its bare number and as
# <number>:<its picker entry in base64>. The entry is its title without the conventional
# `type(scope):` prefix, and base64 keeps any title whole through `fly ssh console`. The bare
# number is what a machine still on the script from before the picker keeps a preview by.
[
  .[]
  | "\(.number)",
    "\(.number):" + ({number, title: (.title | sub("^\\w+(\\([^)]*\\))?!?:\\s*"; ""))} | tojson | @base64)
]
| join(" ")
