# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.10.3](https://github.com/danwahlin/ai-repo-adventures/compare/v1.10.2...v1.10.3) (2025-10-04)


### Bug Fixes

* add GITHUB_TOKEN to publish step for proper authentication ([7a359af](https://github.com/danwahlin/ai-repo-adventures/commit/7a359afe79c175d8247f95b976dc46b1564d7227))





## [1.10.2](https://github.com/danwahlin/ai-repo-adventures/compare/v1.10.1...v1.10.2) (2025-10-04)

**Note:** Version bump only for package ai-repo-adventures





## [1.10.1](https://github.com/danwahlin/ai-repo-adventures/compare/v1.10.0...v1.10.1) (2025-10-04)

**Note:** Version bump only for package ai-repo-adventures





# 1.10.0 (2025-10-04)


### Bug Fixes

* add content chunker tests and integrate into unit test runner. Fix chunking logic. ([0872eea](https://github.com/danwahlin/ai-repo-adventures/commit/0872eeaaf2758fbe0a358b79a49e38d34c84ab2b))
* add peer dependency flag to multiple packages in package-lock.json ([ee6fb30](https://github.com/danwahlin/ai-repo-adventures/commit/ee6fb302d99ef8b5727f5b46d5b1e07d42438481))
* Add quest format instructions for consistent markdown output in StoryGenerator ([ca9b94b](https://github.com/danwahlin/ai-repo-adventures/commit/ca9b94bd9d30007352f613e5a90af36998ea460c))
* Adjust background position for mythical quest image to enhance visual presentation ([d785a55](https://github.com/danwahlin/ai-repo-adventures/commit/d785a55ca1df765bde25f4a1d13be30dc873a7bc))
* Change console.warn to console.debug for expected file read failures in FileContentManager ([7f63e16](https://github.com/danwahlin/ai-repo-adventures/commit/7f63e164ce50ebec14b1f19b8a1a62f0bb534a3f))
* Change to AGENTS.md ([d91e91c](https://github.com/danwahlin/ai-repo-adventures/commit/d91e91cb959136058134972affa993abce8096e0))
* clarify comment on GitHub Models section in .env.example ([51ef4e8](https://github.com/danwahlin/ai-repo-adventures/commit/51ef4e812c17a3ee0d91263fdb3f3ec241f59ddb))
* Improve flow in theme generation process and cleanup handling ([6ab7091](https://github.com/danwahlin/ai-repo-adventures/commit/6ab7091fe4c408bbe5c5c289ab45e0c1732dfc6b))
* Remove 'developer' from light themes requiring dark GitHub logo ([42d9150](https://github.com/danwahlin/ai-repo-adventures/commit/42d9150f12ce79ecf1d9d153c46e2e73f152f017))
* Remove console log for homepage index creation ([149e7c6](https://github.com/danwahlin/ai-repo-adventures/commit/149e7c628561c91a07b46af4aba1161732e64f99))
* remove package, update openai ([41974f5](https://github.com/danwahlin/ai-repo-adventures/commit/41974f5e87909d784599e49162d404d6dc8c3050))
* Rename "Change Theme" to "Change Adventure" in HTML templates and styles for clarity ([8b2c88a](https://github.com/danwahlin/ai-repo-adventures/commit/8b2c88a7aa3bef727f0ef5d5e68c40e42156e4d0))
* Save quest content to unique files per quest in HTMLAdventureGenerator ([1d608a1](https://github.com/danwahlin/ai-repo-adventures/commit/1d608a1cd1799a23747e8c5220f4d0432cfbb627))
* standardize quest prefix terminology across themes and clean up title parsing ([dde3a7a](https://github.com/danwahlin/ai-repo-adventures/commit/dde3a7a16c7f1cae9ce3644fc2b27675738dcdcc))
* sync package versions ([2890f6d](https://github.com/danwahlin/ai-repo-adventures/commit/2890f6da7ec842e814d3cb325ea1b1bc622da308))
* **tests:** Ensure clean exit for integration test runner upon completion ([2378d0e](https://github.com/danwahlin/ai-repo-adventures/commit/2378d0e48463facba36ecab88ed990a9dcdf8539))
* **tests:** Improve console output formatting in integration tests and test runner ([c8bef8f](https://github.com/danwahlin/ai-repo-adventures/commit/c8bef8f125b209e606b65c6111dbf3de957fb0f5))
* **tests:** resolve timeout issue in multi-chapter story coherence validation ([bb17dd0](https://github.com/danwahlin/ai-repo-adventures/commit/bb17dd0cad546bd6ba5af3763492039b551f3151))
* **tests:** Update LLM rate limiting test for improved performance assertions ([857f9e8](https://github.com/danwahlin/ai-repo-adventures/commit/857f9e8cd4977137e02c5952820b09928a4b85c5))
* update build script to include asset copying ([1f3a349](https://github.com/danwahlin/ai-repo-adventures/commit/1f3a3490ad27ff01e1b32c537031c3d98ffa2a5e))
* update command in index.html to generate all themes ([14e5e66](https://github.com/danwahlin/ai-repo-adventures/commit/14e5e6639bf79b38014a6bf31feecd44c31528a1))
* update environment variable prefixes to REPO_ADV for mor uniqueness across configurations ([1fd9960](https://github.com/danwahlin/ai-repo-adventures/commit/1fd996025632b9c05ee8404cb28098d4bd3b8aa4))
* Update feature descriptions and improve styling in index.html ([8a8bfdb](https://github.com/danwahlin/ai-repo-adventures/commit/8a8bfdb462d406412c92dad06c2d8a8eef1d9c1f))
* Update LLMClient to handle undefined API key and fallback mode; adjust test imports for dynamic story generator ([4895b40](https://github.com/danwahlin/ai-repo-adventures/commit/4895b4029a084d64c7edff5bf51064f5ad81b3ca))
* update package names and commands for consistency across documentation and configuration ([6e1d6bc](https://github.com/danwahlin/ai-repo-adventures/commit/6e1d6bc556ba084b2e7ceae90b274fc374f6bddc))
* update package names and workflow secrets for consistency ([82e104e](https://github.com/danwahlin/ai-repo-adventures/commit/82e104e67301aab433df474b7b8e6069c9cfd13f))
* update package versions to 1.1.4 and adjust prompt file paths ([e29485a](https://github.com/danwahlin/ai-repo-adventures/commit/e29485a4121696c9e52a8d053a5bc26a3e00bbdb))
* update stylesheet reference in index.html to correct homepage CSS file ([df10f81](https://github.com/danwahlin/ai-repo-adventures/commit/df10f817fb46b1b2bf39dc8bc0ae48c7b0bb19e9))
* update token allocation and add logging for chunking process ([91bc4c8](https://github.com/danwahlin/ai-repo-adventures/commit/91bc4c866d3709d1049f5e1cb3d802465e387d9b))
* **workflow:** update condition to trigger adventure generation on commit message ([45edc6a](https://github.com/danwahlin/ai-repo-adventures/commit/45edc6adc08ac8adae088501f96b4713e7ad4e2a))


### Features

* Add adventure config formatting for prompts and enhance quest content structure ([963bcef](https://github.com/danwahlin/ai-repo-adventures/commit/963bcefaf9002d95f819cbf4da097178edf0e25c))
* add architectural principles section to CLAUDE.md for dynamic story generation insights ([73e77cc](https://github.com/danwahlin/ai-repo-adventures/commit/73e77ccf280f72f85f2c610861933bbf9927f596))
* Add background position variables for story and quest images across themes ([dded2a0](https://github.com/danwahlin/ai-repo-adventures/commit/dded2a03947cf9dfd752852798c7a6ad9f4bbe7b))
* add chalk dependency and refactor interactive test for improved terminal output ([bfffede](https://github.com/danwahlin/ai-repo-adventures/commit/bfffede29f7404dc4cb1253c028fe10c9f852d39))
* Add detailed descriptions for adventure tools to enhance user understanding and guidance ([893163a](https://github.com/danwahlin/ai-repo-adventures/commit/893163abbd5b02f3643d7f8ac942263fb9cf0a72))
* Add file path prefix highlighting in HTML output and corresponding CSS styling ([38fc1ea](https://github.com/danwahlin/ai-repo-adventures/commit/38fc1ea1438a24ddaea8c6ea8090426006053574))
* Add formatted test suite summary table to comprehensive test runner ([6e0fefe](https://github.com/danwahlin/ai-repo-adventures/commit/6e0fefeb5b07dc2c12e4f1d6d32edd12d5a34513))
* Add HTML generator test for minimal LLM usage and output verification ([4f105fa](https://github.com/danwahlin/ai-repo-adventures/commit/4f105fa809542474c2eaf4a4e30533fdc9d9a088))
* Add interactive storytelling quests for the MCP Nebula Chronicles ([49a397b](https://github.com/danwahlin/ai-repo-adventures/commit/49a397bc1a679d2b5df9f281368d33386e92813d))
* Add Microsoft Clarity and Google Analytics tracking support in adventure configuration and templates ([4e1cc1d](https://github.com/danwahlin/ai-repo-adventures/commit/4e1cc1d519081a54858ff341ad2378fff27f2058))
* Add overall statistics table to comprehensive test runner output ([078b99b](https://github.com/danwahlin/ai-repo-adventures/commit/078b99b4fdfeebc15c1135da1a10f8795500ed23))
* Add project info retrieval methods and optimize project info generation in choose-theme tool ([5db5566](https://github.com/danwahlin/ai-repo-adventures/commit/5db5566c9720ffe1e3074c14a5c09450bb20ce6e))
* Add prompt output testing and enhance quest content generation with config merging ([9db5fbc](https://github.com/danwahlin/ai-repo-adventures/commit/9db5fbc3016337485665c5c52ad6322de23b48d6))
* Add quests 3, 4, and 5 with detailed exploration and code snippets ([5abd0ac](https://github.com/danwahlin/ai-repo-adventures/commit/5abd0ac79366b05230c4bcbb14b5ae34bcdcb156))
* Add quests 5, 6, and 7 HTML files for the adventure series ([c0f9745](https://github.com/danwahlin/ai-repo-adventures/commit/c0f97451d6d37781e238c391acc92dfb4ebd677a))
* Add repository URL to adventure config and enhance HTML generation with file hyperlinks ([63230b0](https://github.com/danwahlin/ai-repo-adventures/commit/63230b008e3004e6757b81920f0c84b498c9794d))
* Add section divider styling and improve quest title handling in HTML content generation ([80837af](https://github.com/danwahlin/ai-repo-adventures/commit/80837afce2b29a3b0628bbb0a6f6e9741a379608))
* Add shared types and interfaces for analyzer system ([0e70496](https://github.com/danwahlin/ai-repo-adventures/commit/0e7049660956d45d89d88e6ef709cc309940807c))
* Add story content handling to quest content generation and improve prompt consistency ([29cfc1a](https://github.com/danwahlin/ai-repo-adventures/commit/29cfc1aa034763b956bec96ce5132fb18fbff297))
* Clarify code authenticity requirements and update references to the Complete Codebase section ([6dd246e](https://github.com/danwahlin/ai-repo-adventures/commit/6dd246e5ee9ecca11fcabb7fb72eb47852402685))
* Enhance adventure selection and error handling in LLMClient with input sanitization and Azure configuration validation ([ec360df](https://github.com/danwahlin/ai-repo-adventures/commit/ec360df4084557d6105f98ae5585f8466320e469))
* Enhance HTML Adventure Generator with image handling and theme icons ([e325014](https://github.com/danwahlin/ai-repo-adventures/commit/e3250146998eebf8c32f66a33619ba7cc4c8d72d))
* Enhance HTML generation and add new themes ([baf5627](https://github.com/danwahlin/ai-repo-adventures/commit/baf5627630c87ecc90026b1679b6bf24df898dff))
* Enhance HTML generation with marked for markdown parsing and add new quests ([69befdb](https://github.com/danwahlin/ai-repo-adventures/commit/69befdbcbd4e74067eeefa8d53f96c75bddee2b1))
* Enhance input validation and file processing limits for LLM interactions ([abbcf38](https://github.com/danwahlin/ai-repo-adventures/commit/abbcf38b7a39c9caf7509e473a47a43a1ff7414f))
* Enhance input validation and sanitization across the application ([15c2de3](https://github.com/danwahlin/ai-repo-adventures/commit/15c2de32136ce495ce534686fcb7951c4a78ee04))
* Enhance LLMClient and adventure tools for improved storytelling and response handling ([0182516](https://github.com/danwahlin/ai-repo-adventures/commit/01825168f2a09edadf4a35acd3a962c0d1f635ae))
* Enhance LLMClient to support Azure OpenAI with provider-specific configuration ([b1f5966](https://github.com/danwahlin/ai-repo-adventures/commit/b1f5966c43e1905dbc21be41d71afaa8e838fc96))
* Enhance Prism.js integration and update background position variables for mythical theme ([91f0d16](https://github.com/danwahlin/ai-repo-adventures/commit/91f0d16f0b73644c2035e02f1e910f244b1bb789))
* Enhance project narrative generation with integrated project details and improved instructions ([42dfff1](https://github.com/danwahlin/ai-repo-adventures/commit/42dfff1ca8bbbb803fb9c69462f84efd94f05501))
* Enhance ProjectAnalyzer with configurable timeouts and limits ([b3c5189](https://github.com/danwahlin/ai-repo-adventures/commit/b3c5189dc62ee0b3253531f3ca062092f090b972))
* Enhance quest content generation and logging features ([978b185](https://github.com/danwahlin/ai-repo-adventures/commit/978b185ab7abb47e64461f3b610bde0e5270e709))
* Enhance quest title rendering with inline markdown support and HTML stripping ([d84f5b2](https://github.com/danwahlin/ai-repo-adventures/commit/d84f5b2ba4b78aed40a9f261ad00444747cc7854))
* Enhance README with HTML adventure generation details and testing instructions ([7746301](https://github.com/danwahlin/ai-repo-adventures/commit/77463011473d23f75930d8600bdca238bb0af8a3))
* Enhance story generation with project insights and structured narrative ([8256949](https://github.com/danwahlin/ai-repo-adventures/commit/8256949de27fddf730f85c62b2d2e412f5c6eaa5))
* Enhance story output with title section and improve content trimming in prompts ([3f17731](https://github.com/danwahlin/ai-repo-adventures/commit/3f1773187f58a696f3ce2c4701e53e9f4431a37a))
* Enhance theme management with dynamic theme retrieval and improved descriptions ([929cab1](https://github.com/danwahlin/ai-repo-adventures/commit/929cab180f2db352936528a84dacb45967b989f0))
* enhance user input handling and auto-start adventure in interactive client ([3ab001a](https://github.com/danwahlin/ai-repo-adventures/commit/3ab001a7d33ba760f658514202a6b07c04d6985e))
* Ensure explicit process termination on success for various test runners ([319d726](https://github.com/danwahlin/ai-repo-adventures/commit/319d726975b93d5f51ab7aeabc66e5db2b598fdc))
* implement adaptive throttling for Azure S0 rate limits in LLMClient and enhance unit tests ([ea8e3b3](https://github.com/danwahlin/ai-repo-adventures/commit/ea8e3b333b2dafc020e0e9a69ee0a77ee18f04ce))
* Implement adventure framework with character interactions and story generation ([c4fecae](https://github.com/danwahlin/ai-repo-adventures/commit/c4fecaeac8a5560c2b06b5fb73759112d2723bf8))
* Implement automatic mode switching for token rate limit handling ([da953b6](https://github.com/danwahlin/ai-repo-adventures/commit/da953b671661a8f2876f65f23d1c9b8b84639dc3))
* Implement comprehensive HTML and markdown validation utilities ([0b66d6e](https://github.com/danwahlin/ai-repo-adventures/commit/0b66d6e30702d13454800265c69f942c1a9a39ae))
* Implement DevServer for serving generated adventure files ([674b837](https://github.com/danwahlin/ai-repo-adventures/commit/674b837172474d61ad8f2c52a1dcbdb2d1524834))
* Implement Dynamic Story Generator for codebase exploration ([a4c538d](https://github.com/danwahlin/ai-repo-adventures/commit/a4c538d0e2987eda5d54f71a39df104402a1a261))
* Implement LRUCache for efficient data caching with TTL management ([354c60d](https://github.com/danwahlin/ai-repo-adventures/commit/354c60d1dce06f74df990251ed19702474d42cbd))
* Implement template engine for HTML generation and refactor quest page rendering ([be930e0](https://github.com/danwahlin/ai-repo-adventures/commit/be930e05a48051174b15f13d773edc0bd7e6e29e))
* Implement ThemeManager for managing adventure themes and guidelines ([cbb68f9](https://github.com/danwahlin/ai-repo-adventures/commit/cbb68f9f714fe82005c915b8f9d22b99fe973594))
* Improve error handling for unhandled promise rejections in MCP server ([262707c](https://github.com/danwahlin/ai-repo-adventures/commit/262707cdab826046c7720081a01f5e13971f6998))
* Improve logging and content processing in various modules; update templates and styles ([e296115](https://github.com/danwahlin/ai-repo-adventures/commit/e2961159c148bac80b2333c607fe53e78022abd9))
* Improve story generation and adventure title guidelines in AdventureManager and integration tests ([3c05781](https://github.com/danwahlin/ai-repo-adventures/commit/3c057812e20ab4360a4bbe03f4bfa1122812638f))
* Load environment variables from .env file in config ([3abcea9](https://github.com/danwahlin/ai-repo-adventures/commit/3abcea95d9a6b079fa3bdc4a0f0d7475f8376274))
* Refactor adventure guidance handling and improve prompt formatting in story generation ([cd34031](https://github.com/danwahlin/ai-repo-adventures/commit/cd34031afb73cf79967eba0af5a6725ed1741d90))
* refactor adventure management and enhance error handling in LLM client ([446032a](https://github.com/danwahlin/ai-repo-adventures/commit/446032aa7e544146ddceac11759e487803990d0d))
* Refactor adventure themes and integrate new mythical theme ([08f79fd](https://github.com/danwahlin/ai-repo-adventures/commit/08f79fd25283d02b1f23c4c35f0fee0e1f0c384e))
* Refactor package structure and update dependencies to use [@codewithdan](https://github.com/codewithdan) scope; add README for core package ([c94f05d](https://github.com/danwahlin/ai-repo-adventures/commit/c94f05da8a1732409b35e594d79c35de2ce299d2))
* Refine quest result formatting and update markdown output guidelines for consistency ([ab455a9](https://github.com/danwahlin/ai-repo-adventures/commit/ab455a974d915b369dd1d46f8ec09fe135ba5c17))
* Remove redundant format requirement from adventure config formatting function ([929c616](https://github.com/danwahlin/ai-repo-adventures/commit/929c61624480a7f22f02e1f6234f8ad188970c43))
* Simplify default theme configuration by replacing dynamic import with static value ([e624f58](https://github.com/danwahlin/ai-repo-adventures/commit/e624f5844de225c596ca00fab618ac54e192e30b))
* Simplify quest extraction and improve navigation title truncation in HTML output ([e87b3ce](https://github.com/danwahlin/ai-repo-adventures/commit/e87b3ce004e35692460f4f07d95fc4adccfc8d22))
* **tests:** Add comprehensive LLM validation tests for story and adventure structure ([48c865b](https://github.com/danwahlin/ai-repo-adventures/commit/48c865be12befe4f9442b7e01efd330841d0ffa8))
* **tests:** Add integration tests and enhance unit test structure with shared utilities ([e3a3c40](https://github.com/danwahlin/ai-repo-adventures/commit/e3a3c40a9c2deb11643ac64c5391587a6536693e))
* **tests:** Enhance comprehensive test runner with individual test tracking and detailed statistics ([371a9a4](https://github.com/danwahlin/ai-repo-adventures/commit/371a9a425da892081b188ea81f4248d773f3d161))
* **tests:** Replace test-analysis-details and test-code-analysis with cross-language analysis tests for improved parsing validation ([b2c9b2b](https://github.com/danwahlin/ai-repo-adventures/commit/b2c9b2b50da72f6f066cd148a6b2b8fa44eea953))
* **tests:** Revamp testing framework and add comprehensive unit tests ([e7d4d89](https://github.com/danwahlin/ai-repo-adventures/commit/e7d4d89f0181e89515284e5493292999d7c992d3))
* Update adventure guidelines and enhance file reading capabilities in AdventureManager ([c4b87d4](https://github.com/danwahlin/ai-repo-adventures/commit/c4b87d411a400931b64acba7858623da5875bd83))
* Update dependencies and enhance adventure generation logic with improved error handling and file indexing ([218bc83](https://github.com/danwahlin/ai-repo-adventures/commit/218bc8386a5379feb01c92bb78bf38b5471e3a42))
* Update formatting instructions in adventure config for clarity and consistency ([ed03622](https://github.com/danwahlin/ai-repo-adventures/commit/ed03622d2395bbc6a681a821d307403be3870971))
* Update HTML generator to streamline index page creation and add HTTP server for testing ([0726611](https://github.com/danwahlin/ai-repo-adventures/commit/0726611cf2ac4f15ff7c472971a59b7098bb02e6))
* Update keywords for Developer Documentation theme to enhance search relevance ([8b0fff4](https://github.com/danwahlin/ai-repo-adventures/commit/8b0fff42a9cd2502b485fb948a6e47f3a6e94700))
* update logging options in CLI and documentation for clarity ([88167bd](https://github.com/danwahlin/ai-repo-adventures/commit/88167bd1a346e410bb12a596bd4c2d2001aa62bd))
* Update quest description formatting to use inline markdown for consistency ([39f2157](https://github.com/danwahlin/ai-repo-adventures/commit/39f21579a73128c037885649e104e4ff92814e38))
* Update test commands and add non-interactive test for MCP client functionality ([c304200](https://github.com/danwahlin/ai-repo-adventures/commit/c304200561bbdadf412923323420d036923f6a53))
