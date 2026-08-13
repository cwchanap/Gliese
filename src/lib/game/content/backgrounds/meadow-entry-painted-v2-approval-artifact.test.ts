import { describe, expect, it } from 'vitest';

import {
	meadowEntryPaintedV2ArtPackageApproval,
	meadowEntryPaintedV2ArtPackageApprovalReview
} from '$lib/game/content/approvals/meadow-entry-painted-v2-art-package';

describe('painted-v2 reviewed approval artifact', () => {
	it('seals the exact approved reviewer and valid UTC instant', () => {
		expect(meadowEntryPaintedV2ArtPackageApprovalReview).toStrictEqual({
			reviewedBy: 'chanwaichan',
			reviewedAt: '2026-08-13T16:38:18Z'
		});
		expect(meadowEntryPaintedV2ArtPackageApprovalReview.reviewedAt).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
		);
	});

	it('pins every reviewed package artifact and provenance value as literals', () => {
		expect(meadowEntryPaintedV2ArtPackageApproval).toStrictEqual({
			version: 1,
			combinedControlFingerprint:
				'0916ae390990efcc7fc5ec6df5045b07c9b472cc54cb58625293bcb8445ca6cf',
			storageMode: 'git-lfs',
			storageConfigurationSha256:
				'36737b6905cfc7c62fdf1bcdd48850bc574f20d7f4bfb63ab1aa8c727bc51de2',
			provenanceSha256: 'eaa1c13f851cb522501fbc0abe3062b746971ab0c5a6dc3b182a83649ee7526b',
			concept: {
				path: 'artifacts/meadow-entry/painted-v2/concept/meadow-entry-painted-v2-concept.png',
				sha256: '3c08e40249af015a5574acbd310486bdae594c64167d6d5c0042184a2647b312',
				bytes: 79514382,
				width: 6400,
				height: 6400,
				provenancePath:
					'artifacts/meadow-entry/painted-v2/concept/meadow-entry-painted-v2-concept-provenance.json',
				provenanceSha256: 'aa534c8494d37882c44781ad1bc0fdda13fa14533a24ca5150b84ab5591f1b66'
			},
			sourcePanels: [
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.png',
					sha256: '3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
					bytes: 6901740,
					width: 2624,
					height: 1088,
					id: 'sundrop-north',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-north.png',
						sha256: '98471a8459c46c4aa18a0b497c65497f86c7bfe702dc7730bfe0ca9bafe316dd',
						bytes: 2555816,
						width: 1947,
						height: 808
					},
					provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.json',
					provenanceSha256: '2321a5caeaa241bceab4d823eb94271f7fae4afd660d9f1c64e1cedc65b22749',
					assemblyPriority: 10,
					bounds: {
						left: 256,
						top: 3968,
						right: 2880,
						bottom: 5056
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.png',
					sha256: 'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
					bytes: 8355861,
					width: 2624,
					height: 1216,
					id: 'sundrop-south',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-south.png',
						sha256: '01231456ed9b785ce2002b541bfff668b9edec1e6c5d73233878cf56b5626669',
						bytes: 2961126,
						width: 1842,
						height: 854
					},
					provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.json',
					provenanceSha256: 'dd0d423a46f269f29922f2ee2366fdaa7784a71bf3b3137bfe1c2b4e25bd6424',
					assemblyPriority: 20,
					bounds: {
						left: 256,
						top: 4928,
						right: 2880,
						bottom: 6144
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.png',
					sha256: '9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
					bytes: 1934578,
					width: 896,
					height: 832,
					id: 'hero-house-frontage',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/hero-house-frontage.png',
						sha256: '50fc866503a2ba03db79aff06720fe9fef305f429ed1ccd737f6403533414178',
						bytes: 2605661,
						width: 1302,
						height: 1208
					},
					provenancePath:
						'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.json',
					provenanceSha256: 'b3679ed0c19078896e2e32b1741ce3a0dcc384e93e8d63f49361ae2a38929894',
					assemblyPriority: 30,
					bounds: {
						left: 384,
						top: 5312,
						right: 1280,
						bottom: 6144
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.png',
					sha256: '6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
					bytes: 888497,
					width: 800,
					height: 416,
					id: 'village-crossroads-connector',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/village-crossroads-connector.png',
						sha256: 'b01f14ada4a29cc47af9d31e58545346fb5a9ce93f347c209c72d2f95ea5f2e6',
						bytes: 2318631,
						width: 1739,
						height: 904
					},
					provenancePath:
						'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json',
					provenanceSha256: 'c68f7cdacca6c91ce6f69196381776a515e7e0cdf0c1b4550f3c8208996159ab',
					assemblyPriority: 40,
					bounds: {
						left: 2592,
						top: 4480,
						right: 3392,
						bottom: 4896
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png',
					sha256: '1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
					bytes: 9127338,
					width: 1728,
					height: 1952,
					id: 'crossroads',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png',
						sha256: 'a443043caba03ae2d38d4d18e6795f86a4f4cb6636f4b779f653071cfb71328a',
						bytes: 2941971,
						width: 1180,
						height: 1333
					},
					provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json',
					provenanceSha256: 'e43d304c455212b9458a0f75bc75fc88f7cf05d487f0a6f4df92756ea99116d1',
					assemblyPriority: 50,
					bounds: {
						left: 2880,
						top: 2816,
						right: 4608,
						bottom: 4768
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png',
					sha256: '6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
					bytes: 13836363,
					width: 3200,
					height: 1664,
					id: 'camera-underlay-sundrop-north',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-north.png',
						sha256: 'e9d63980aa85768571299f493b4e03e6795a8fcdba2f60f7d01e9ba57e91988e',
						bytes: 2711129,
						width: 1740,
						height: 904
					},
					provenancePath:
						'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.json',
					provenanceSha256: '6482ddbab31031ee9eb46be28cf470f37595308e9bda984fa54e5742a7dd6ba6',
					assemblyPriority: 0,
					bounds: {
						left: 0,
						top: 3200,
						right: 3200,
						bottom: 4864
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png',
					sha256: '94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
					bytes: 12447759,
					width: 3200,
					height: 1664,
					id: 'camera-underlay-sundrop-south',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png',
						sha256: '41b2d2ad670f7ff42fa159d115deb20b0a51c0ffe87cc53c08c6fb9f9594be25',
						bytes: 2421988,
						width: 1739,
						height: 904
					},
					provenancePath:
						'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.json',
					provenanceSha256: '618447495c97482de90e5ea3963d79e3310bbd5e9ca814d4dbc74c1aa17ba5dd',
					assemblyPriority: 1,
					bounds: {
						left: 0,
						top: 4736,
						right: 3200,
						bottom: 6400
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
					sha256: '4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
					bytes: 13992978,
					width: 3200,
					height: 1664,
					id: 'camera-underlay-crossroads-north',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png',
						sha256: 'c6159550334bb8fb3df538911fbdef7308487025ed7ef0a036fb5d2a2eb9e35e',
						bytes: 2745221,
						width: 1740,
						height: 904
					},
					provenancePath:
						'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json',
					provenanceSha256: '171e4c1a40f2532c2af55a10677a45be2d670e8e4c7581a118b4ffc223fbf44b',
					assemblyPriority: 2,
					bounds: {
						left: 2368,
						top: 2240,
						right: 5568,
						bottom: 3904
					}
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png',
					sha256: 'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
					bytes: 13998698,
					width: 3200,
					height: 1664,
					id: 'camera-underlay-crossroads-south',
					raw: {
						path: 'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png',
						sha256: 'dcb992e1a33ab72d33321b18e8523a5fcb9e779b11d6a14ac405b5fdcbdd387a',
						bytes: 2725374,
						width: 1738,
						height: 905
					},
					provenancePath:
						'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json',
					provenanceSha256: '3b0e3250c635e12ecd1fa457ca9ed20757727ac47b3aaceb82a89f5af26dcc90',
					assemblyPriority: 3,
					bounds: {
						left: 2368,
						top: 3776,
						right: 5568,
						bottom: 5440
					}
				}
			],
			baseMaster: {
				path: 'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
				sha256: '8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
				bytes: 50509688,
				width: 6400,
				height: 6400
			},
			foregroundMaster: null,
			cropManifestSha256: '9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
			masterProvenanceSha256: 'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
			exportProvenanceSha256: 'c15771a0f30d6ccc11a17893d1f79cbce087ecd83a3eded9aaa9f36c09693dfd',
			exports: [
				{
					path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png',
					sha256: 'ab819e538f41ea30a0cb8b0a310a6d6211ca553d8e4d9ef3f8d8094475243d4b',
					bytes: 27604984,
					width: 3200,
					height: 3200,
					cropId: 'painted-v2-crossroads-camera-base',
					plane: 'base',
					textureKey: 'meadow-entry-painted-v2-crossroads-camera-base',
					drawOrder: 10
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-camera-base.png',
					sha256: 'fbf564358f64a486979c3c5ffbed9bbc8784ec4b106f9f72341b46dda720aa5e',
					bytes: 26114768,
					width: 3200,
					height: 3200,
					cropId: 'painted-v2-sundrop-camera-base',
					plane: 'base',
					textureKey: 'meadow-entry-painted-v2-sundrop-camera-base',
					drawOrder: 0
				}
			],
			proofs: [
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-base-coverage.png',
					sha256: 'af394ba69824706dae7b3da4204f8539470de39a34ebd793e12935efe543d3a1',
					bytes: 49943695,
					width: 5568,
					height: 4160,
					proofId: 'pilot-base-coverage',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-camera-envelope.png',
					sha256: '0d138972b872e4a1f263ac9e9450158b9f002dbd9508ff6d9c5cdcedc84107bd',
					bytes: 49508454,
					width: 6400,
					height: 6400,
					proofId: 'pilot-camera-envelope',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'b9698e67686fcee11d031e444dd8f36aa5ada39a81be00a89bc4a00ef75b0139'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-detail-panel-handoffs.png',
					sha256: 'aeeb3b97fb554f2854e741f5a38542dae580629130911f840905c459a6cc74f4',
					bytes: 49652823,
					width: 5632,
					height: 4224,
					proofId: 'pilot-detail-panel-handoffs',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-master-transparency.png',
					sha256: '8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
					bytes: 50509688,
					width: 6400,
					height: 6400,
					proofId: 'pilot-master-transparency',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-ownership.png',
					sha256: '6ab21701c374ffeaae371299c7bd9070fe08c6cf5107affcacfa8a0aea353522',
					bytes: 40143249,
					width: 6400,
					height: 6400,
					proofId: 'pilot-ownership',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'4c84852b79f1dc03e8b67e6c1ad3d1fca827afc8f167ec99512fe3098a9fd77c',
						'bd9624b2b761e2071d9d45c1c556e71c05c3298cec8439db3220aa8eb2ed3e8e'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-protected-live.png',
					sha256: '644f7d9227c8079280550795e3735d6705925d22644bc4cb1a17d430e22d307f',
					bytes: 41120699,
					width: 6400,
					height: 6400,
					proofId: 'pilot-protected-live',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'2ca64d6a06198b48472349ad8055e538498b4199a5c1dcecd77868ba1ec193e1'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-runtime-overlap.png',
					sha256: '8a5d6f57f9bda060f75d74a3c7edb1316a206b8e52bc4a82634979a1dd48e310',
					bytes: 7317,
					width: 832,
					height: 2240,
					proofId: 'pilot-runtime-overlap',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'fbf564358f64a486979c3c5ffbed9bbc8784ec4b106f9f72341b46dda720aa5e',
						'ab819e538f41ea30a0cb8b0a310a6d6211ca553d8e4d9ef3f8d8094475243d4b'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-underlay-crossroads-seam.png',
					sha256: '136db3af59ef75970141b818ed317ed634027a93e31f553c38c55397addb7ed3',
					bytes: 1019095,
					width: 3328,
					height: 256,
					proofId: 'pilot-underlay-crossroads-seam',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'17f5e461469eb1beafb6fe60d140f2515809739c156a7a647ed18c17ceaad176',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-underlay-family-handoff.png',
					sha256: '1de857706e8be3385d414cdc2e771557faa852c6cfb429a91c369fb42d4437de',
					bytes: 4778625,
					width: 960,
					height: 2368,
					proofId: 'pilot-underlay-family-handoff',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'b9698e67686fcee11d031e444dd8f36aa5ada39a81be00a89bc4a00ef75b0139',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748'
					]
				},
				{
					path: 'artifacts/meadow-entry/painted-v2/proofs/pilot-underlay-sundrop-seam.png',
					sha256: '78147e18b5b59b4c525c1464c1c23e65ef5d3f0064e02fe27f078acbea910923',
					bytes: 983898,
					width: 3264,
					height: 256,
					proofId: 'pilot-underlay-sundrop-seam',
					inputSha256: [
						'8de845c8d06727c199b8dcb0f09c6db9b2d85ed936e8de5db985800032d047ac',
						'a9ec4b53cacf20221dea987f4b409dc29763d7665cdeafce151c78457130f08b',
						'77bf248610558f47249de79e1cb399bf2f287296d671a2de7ec6db86b988a116',
						'9e9b299e0000c9f8265031a827a3c8f9e38e783dfbca872be20727027b984e87',
						'3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
						'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
						'9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
						'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
						'1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4',
						'4879be0e81e6182132c2233b58b9b8a12b660e2505793eda916377e77509b8c1',
						'fe28ee5172107f3bdb58f52a7e07832b8fe2d9a483f4be47e012ac9aa556b748',
						'17f5e461469eb1beafb6fe60d140f2515809739c156a7a647ed18c17ceaad176',
						'6c1c08de57b73463cc5b126cb9069bfd8306262e8608fa822e34da49c86a7a89',
						'94be6dda1447e24fb769f19bad4e4ef7bf261605a36a2287ae01e589015c29a4'
					]
				}
			],
			evidencePath:
				'docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md'
		});
	});
});
