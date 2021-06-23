# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.2.0](https://github.com/serverless/serverless-google-cloudfunctions/compare/v4.1.0...v4.2.0) (2021-06-17)

### Features

- Add support for http events in invoke local ([#264](https://github.com/serverless/serverless-google-cloudfunctions/issues/264)) ([446d161](https://github.com/serverless/serverless-google-cloudfunctions/commit/446d161a3ddff8e3eaed41af0f9e415726cd23dd)) ([Corentin Doue](https://github.com/CorentinDoue))

## [4.1.0](https://github.com/serverless/serverless-google-cloudfunctions/compare/v4.0.0...v4.1.0) (2021-06-07)

### Features

- Add support for invoke local ([#258](https://github.com/serverless/serverless-google-cloudfunctions/issues/258)) ([9e07fed](https://github.com/serverless/serverless-google-cloudfunctions/commit/9e07fedf8049836a45b038ddd2b972526c8aee6a)) ([Corentin Doue](https://github.com/CorentinDoue))

### Bug Fixes

- CLI option `count` type deprecation warning ([#257](https://github.com/serverless/serverless-google-cloudfunctions/issues/257)) ([8b97064](https://github.com/serverless/serverless-google-cloudfunctions/commit/8b970648f08ee39c1e8d60a373c2c1798c8cde3f)) ([Michael Haglund](https://github.com/hagmic))

## [4.0.0](https://github.com/serverless/serverless-google-cloudfunctions/compare/v3.1.1...v4.0.0) (2021-04-12)

### ⚠ BREAKING CHANGES

- Node.js version 10 or later is required (dropped support for v6 and v8)
- Default runtime has been changed to `nodejs10`

### Features

- Add schema validation ([#252](https://github.com/serverless/serverless-google-cloudfunctions/issues/252)) ([c332d3d](https://github.com/serverless/serverless-google-cloudfunctions/commit/c332d3d909b6984395cee003f4a139d5aa9e0729)) ([Corentin Doue](https://github.com/CorentinDoue))

### Bug Fixes

- Authentication and Logs ([#244](https://github.com/serverless/serverless-google-cloudfunctions/issues/244)) ([8a34b88](https://github.com/serverless/serverless-google-cloudfunctions/commit/8a34b88250e4cacda46f34024ba482b2051deac9)) ([Rothanak So](https://github.com/rothso) & [Mahamed](https://github.com/upodroid))

## [3.1.1](https://github.com/serverless/serverless-google-cloudfunctions/compare/v3.1.0...v3.1.1) (2020-08-27)

### Bug Fixes

- Deploy bucket in configured location ([#227](https://github.com/serverless/serverless-google-cloudfunctions/issues/227)) ([86494b4](https://github.com/serverless/serverless-google-cloudfunctions/commit/86494b4ef88ac54ccb0d29014a2bb3806c055ea9))
- Fix deployment status when the function name is specified ([#225](https://github.com/serverless/serverless-google-cloudfunctions/issues/225)) ([251e1cf](https://github.com/serverless/serverless-google-cloudfunctions/commit/251e1cf61c04a0d28509eea08b603a91f6d73440))

## [3.1.0](https://github.com/serverless/serverless-google-cloudfunctions/compare/v3.0.0...v3.1.0) (2020-05-11)

### Features

- Support serviceAccount option for deployment ([#215](https://github.com/serverless/serverless-google-cloudfunctions/issues/215)) ([1164495](https://github.com/serverless/serverless-google-cloudfunctions/commit/11644956771bc64dc0259b6316502f104fadf1ea))

### Bug Fixes

- Fix function name resolution on invoke ([#216](https://github.com/serverless/serverless-google-cloudfunctions/issues/216)) ([86d40aa](https://github.com/serverless/serverless-google-cloudfunctions/commit/86d40aa3ab07e512eb7e6a92424db399335a8201))

## [3.0.0](https://github.com/serverless/serverless-google-cloudfunctions/compare/v2.4.3...v3.0.0) (2020-04-01)

### ⚠ BREAKING CHANGES

- Drop support for Node.js v6
- Services deployed with v1 Beta cannot be updated with v1.

Co-authored-by: Jeremy Minhua Bao (US - ADVS) <jeremy.bao@pwc.com>
Co-authored-by: zxhaaa <zxhaaa@hotmail.com>
Co-authored-by: Peachey_Chen <mr_robot2015@foxmail.com>

### Features

- Switch from CloudFunctions v1 beta to v1 ([#206](https://github.com/serverless/serverless-google-cloudfunctions/issues/206)) ([482ee0e](https://github.com/serverless/serverless-google-cloudfunctions/commit/482ee0e63a1f72dec8cce6c80dfe66ab406671ae))
- Upgrade googleapis to latest version ([#209](https://github.com/serverless/serverless-google-cloudfunctions/issues/209)) ([ab0d8ba](https://github.com/serverless/serverless-google-cloudfunctions/commit/ab0d8ba802d5999c9848232e836651c577a9f0cd))

### [2.4.3](https://github.com/serverless/serverless-google-cloudfunctions/compare/v2.4.2...v2.4.3) (2020-04-01)

### Bug Fixes

- Revert breaking switch from v1 beta to v1 CloudFunctions ([#207](https://github.com/serverless/serverless-google-cloudfunctions/issues/207)) ([fc1dbe2](https://github.com/serverless/serverless-google-cloudfunctions/commit/fc1dbe28be4b1dab0abe4216993c63c543e547eb))

### [2.4.2](https://github.com/serverless/serverless-google-cloudfunctions/compare/v2.4.1...v2.4.2) (2020-03-25)

- Ensure to rely internally on v1 and not v1 Beta CloudFunctions API ([#165](https://github.com/serverless/serverless-google-cloudfunctions/issues/165)) ([Eisuke Kuwahata](https://github.com/mather))

### [2.4.1](https://github.com/serverless/serverless-google-cloudfunctions/compare/v2.4.0...v2.4.1) (2020-02-28)

### Bug Fixes

- Bring back Node.js v6 support ([#197](https://github.com/serverless/serverless-google-cloudfunctions/issues/197)) ([f3b9881](https://github.com/serverless/serverless-google-cloudfunctions/commit/f3b9881086ff39416861c7b0549a4ded14fe7268)) ([Mariusz Nowak](https://github.com/medikoo))
- Fix handling of `maxInstances` setting ([#199](https://github.com/serverless/serverless-google-cloudfunctions/issues/199)) ([4ea8418](https://github.com/serverless/serverless-google-cloudfunctions/commit/4ea841879edf8605fe5b38668f6d1fb875347aae)) ([holmerjohn](https://github.com/holmerjohn))
