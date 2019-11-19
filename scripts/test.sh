#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache-cli instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_cli_pid" ] && ps -p $ganache_cli_pid > /dev/null; then
    kill -9 $ganache_cli_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_cli_port=8555
else
  ganache_cli_port=8545
fi

ganache-cli_running() {
  nc -z localhost "$ganache_cli_port"
}

start_ganache-cli() {
  # We define 10 accounts with balance 10M ether, needed for high-value tests.
  local accounts=(
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c00,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c01,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c02,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c03,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c04,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c05,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c06,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c07,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c08,1000000000000000000000000"
    --account="0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c09,1000000000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    npx ganache-cli-coverage --gasLimit 0xfffffffffff --port "$ganache_cli_port" "${accounts[@]}" > /dev/null &
  else
    npx ganache-cli --gasLimit 0xfffffffffff "${accounts[@]}" > /dev/null &
  fi

  ganache_cli_pid=$!
}

if ganache-cli_running; then
  echo "Using existing ganache-cli instance"
else
  echo "Starting our own ganache-cli instance"
  start_ganache-cli
fi

if [ "$SOLIDITY_COVERAGE" = true ]; then
  npx solidity-coverage

  if [ "$CONTINUOUS_INTEGRATION" = true ]; then
    cat coverage/lcov.info | npx coveralls
  fi
else
  npx truffle test "$@"
fi
