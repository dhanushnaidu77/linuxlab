# Sourced by every scenario script (setup/check/cleanup/solve). Runs on the console host.
# LAB_VARS holds the names of scenario vars, forwarded into the lab containers.

_lab_env_flags() { local v; for v in $LAB_VARS; do printf -- '-e\n%s\n' "$v"; done; }

# on <host> '<cmd>'   |   on <host> <<'EOF' ... EOF
on() {
  local host=$1; shift
  local -a flags; mapfile -t flags < <(_lab_env_flags)
  if [ $# -gt 0 ]; then docker exec -i "${flags[@]}" "$host" bash -c "$*"
  else docker exec -i "${flags[@]}" "$host" bash -s; fi
}

# as_user <host> <user> '<cmd>'
as_user() {
  local host=$1 user=$2; shift 2
  local -a flags; mapfile -t flags < <(_lab_env_flags)
  docker exec -i -u "$user" -w /tmp "${flags[@]}" "$host" bash -c "$*"
}

# fail '<reason>' — print reason and exit non-zero (use in check.sh)
fail() { echo "$*"; exit 1; }
