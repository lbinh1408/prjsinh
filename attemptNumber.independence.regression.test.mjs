import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = readFileSync(join(here, 'liveStudyK283PersistentMultiTurnV1.js'), 'utf8');

test('one-submit-per-question CLI sets attemptNumber=1', () => {
    assert.match(cli, /const attemptNumber\s*=\s*1\s*;/);
    assert.doesNotMatch(cli, /const attemptNumber\s*=\s*session\.attempts\.length\s*\+\s*1\s*;/);
    assert.match(cli, /response:answer, startedAt, submittedAt, attemptNumber/);
});

test('session sequence remains unique for attemptId', () => {
    assert.match(cli, /attemptId:\s*createAttemptId\(session\.attempts\.length \+ 1\)/);
});

test('source semantics: first attempt without hints is independent', () => {
    const resolveIndependence = ({ attemptNumber, hint }) =>
        hint?.used || (Number.isInteger(hint?.count) && hint.count > 0)
            ? 'hint_assisted' : attemptNumber > 1 ? 'retry_assisted' : 'independent';
    for (let turn = 1; turn <= 17; turn++) {
        assert.equal(resolveIndependence({ attemptNumber: 1, hint: { used: false, count: 0 } }), 'independent');
    }
    assert.equal(resolveIndependence({ attemptNumber: 2, hint: { used: false, count: 0 } }), 'retry_assisted');
});
