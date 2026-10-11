import path from 'node:path';
import fs from 'node:fs';
import { createAtomicCaptureCoordinationV1 } from '../../../src/restoration/atomicCaptureCoordinationV1.js';
import { createAtomicSnapshotPublicationV1 } from '../../../src/restoration/atomicSnapshotPublicationV1.js';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
const [root, command, session = 's', arg = ''] = process.argv.slice(2);
const store = createDurableAttemptStore({ rootDir: path.join(root, "attempts") });
const publisher = createAtomicSnapshotPublicationV1({ rootDir: root });
const obs = () => ({ status: 'CONSISTENT', resumeAuthorized: false, retryAuthorized: false, executable: false, recoveryAuthorized: false, attemptIds: store.listAttemptIds({ sessionId: session }) });
const coord = createAtomicCaptureCoordinationV1({
    rootDir: root, publisher, capture: () => {
        if (command === 'holdCapture') { process.stdout.write('CAPTURE_HELD\n'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000); }
        return obs();
    }
});
try {
    let result;
    if (command === 'token') result = coord.issuePublisherToken({ sessionId: session });
    else if (command === 'publish' || command === 'holdCapture') result = coord.publishCaptured({ sessionId: session, token: { sessionId: session, epoch: Number(arg) } });
    else if (command === 'writer' || command === 'holdWriter') result = coord.withWriter({
        sessionId: session, write: ({ epoch }) => {
            if (command === 'holdWriter') { process.stdout.write('WRITER_HELD\n'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000); }
            const attempt = { attemptId: arg || 'a1', answer: 'payload' };
            store.appendAttempt({ sessionId: session, attempt }); return { epoch, attempt };
        }
    });
    else if (command === 'read') result = publisher.read({ sessionId: session });
    else if (command === 'inspect') result = coord.inspect({ sessionId: session });
    else if (command === 'directWrite') { store.appendAttempt({ sessionId: session, attempt: { attemptId: arg || 'bypass', answer: 'payload' } }); result = { bypass: true }; }
    else throw Error('UNKNOWN_COMMAND');
    process.stdout.write(JSON.stringify(result) + '\n');
} catch (e) { process.stderr.write((e.code || e.message) + '\n'); process.exitCode = 2; }
