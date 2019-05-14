# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.7] - 2019-05-14
### Fixed
- Now the ethers that are left over when the cap is reached and the contribution
has been made by the gateway, are sent to the investor and not to the gateway
- Now the calculation of interest, when lending days are zero, is equal to 0%
and not variable depending on the days that have passed since the end of the
project and the day that is claimed
