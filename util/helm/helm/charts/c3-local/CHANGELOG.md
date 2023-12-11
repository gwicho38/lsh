# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.0] - 2022-08-25

### Added

- `default` and `test` IP address pools (depends on CRD)

## [3.1.0] - 2022-06-02

### Added

- `metallb.universe.tf/address-pool` service annotations for postgresql and cassandra

### Changed

- `c3-selenium` dependency to `4.1.0`

## [3.0.0] - 2021-12-21

### Added

- `loadBalancerIP` addresses for all services of type `LoadBalancer`

### Changed

- `c3-selenium` dependency to `4.0.0`
