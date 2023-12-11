# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.1.0] - 2022-06-02 

### Added

- option to specify `loadBalancerIP`
- `metallb.universe.tf/address-pool` annotation when `loadBalancerIP` is specified

### Changed

- image tag(s) determined by coalescing specific tag or `AppVersion`
- specification of service port options
