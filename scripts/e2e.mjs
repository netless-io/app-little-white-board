/** Run against window-manager/example in an isolated, empty test room. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:4001/";
const output = path.resolve(process.env.E2E_OUTPUT_DIR || `output/playwright/little-board-${Date.now()}`);
await mkdir(output, { recursive: true });
const report = { base, startedAt: new Date().toISOString(), cases: [], errors: [], checkpoints: [] };
const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const pages = {};
const run = Date.now();
const teacherUid = `little-teacher-${run}`;
const studentUid = `little-student-${run}`;
let appId;
const check = (name, detail) => { report.cases.push({ name, result: "PASS", detail }); console.log(`PASS ${name}`); };
const button = (page, name) => page.getByRole("button", { name, exact: true });
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
async function state(page) {
    return page.evaluate(({ appId, studentUid }) => {
        const app = window.getManager().queryOne(appId);
        const controller = app.appResult;
        const scene = app.appContext.getView().focusScenePath;
        const runtime = window.appliancePlugin.currentManager;
        const sharedRender = runtime.collector.getAuthSpaceData()?.pageAuth?.[appId]?.[scene]?.render;
        const localRender = runtime.renderControl.pageAuth?.get(appId)?.get(scene)?.render;
        return {
            progress: controller.storage.state.progress,
            students: controller.studentsStorage.state,
            writable: window.room.isWritable,
            sharedRender, localRender, scene,
            answerIds: [...(runtime.renderControl.getPageInfo(studentUid, appId, scene) || [])].sort(),
            data: runtime.collector.serviceStorage[appId]?.[scene] || {},
        };
    }, { appId, studentUid });
}
async function screenshot(label) {
    for (const [role, page] of Object.entries(pages)) {
        await page.mouse.move(5, 5);
        await page.screenshot({ path: path.join(output, `${label}-${role}.png`) });
    }
}
async function draw(page, offset) {
    // Room member state changes before AppliancePlugin applies the tool to its worker.
    await wait(page, () => window.appliancePlugin.currentManager.worker.currentToolsData?.toolsType === 1);
    const box = await page.locator(".app-litteBoard-whiteboard").boundingBox();
    assert.ok(box && box.width > 200 && box.height > 200, "whiteboard is visible");
    const x = box.x + box.width * .3;
    const y = box.y + box.height * .35 + offset;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 45, { steps: 12 });
    await page.mouse.move(x + 140, y - 10, { steps: 16 });
    await page.mouse.up();
}
try {
    for (const [role, uid] of [["teacher", teacherUid], ["student", studentUid]]) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = pages[role] = await context.newPage();
        page.on("pageerror", error => report.errors.push({ role, message: String(error) }));
        const url = new URL(base);
        for (const [key, value] of Object.entries({ uid, nickName: role === "teacher" ? "Teacher" : "Student", force: "1", lazy: "0", cursor: "false" })) url.searchParams.set(key, value);
        await page.goto(url.toString());
        await wait(page, () => window.room?.phase === "connected" && !!window.appliancePlugin?.currentManager?.renderControl);
        assert.equal(await page.evaluate(() => window.getManager().queryAll().length), 0, "Use an empty isolated room; no existing apps are removed by this test");
    }
    const { teacher, student } = pages;
    assert.equal(await teacher.evaluate(() => window.room.uuid), await student.evaluate(() => window.room.uuid));
    check("two isolated clients join the same room");
    await button(teacher, "LittleBoard").click();
    await button(teacher, "发布").waitFor();
    appId = await teacher.evaluate(() => window.getManager().queryAll().find(app => app.kind === "LittleBoard").id);
    for (const page of [teacher, student]) {
        await wait(page, id => window.getManager().queryOne(id)?.appResult?.getVDom()?.element instanceof HTMLElement, appId);
    }
    await student.getByRole("status").filter({ hasText: "等待老师出题中" }).waitFor();
    assert.equal((await state(student)).writable, false);
    check("teacher prepares a question; student waits read only");

    await button(teacher, "画笔").click();
    for (const [label, strokeType] of [["压感笔", "Stroke"], ["点线笔", "Dotted"], ["虚线笔", "LongDotted"], ["普通笔", "Normal"]]) {
        const choice = button(teacher, label);
        await choice.click();
        await wait(teacher, type => window.room.state.memberState.strokeType === type, strokeType);
        assert.equal(await choice.getAttribute("aria-pressed"), "true");
        assert.equal(await choice.evaluate(el => el === document.activeElement), true, "tool state updates preserve focus");
    }
    await button(teacher, "普通笔").click();
    const range = teacher.getByRole("slider", { name: "透明度" });
    await range.focus();
    await range.press("Home");
    await wait(teacher, () => window.room.state.memberState.strokeOpacity === 0);
    await range.press("End");
    await wait(teacher, () => window.room.state.memberState.strokeOpacity === 1);
    assert.ok(await teacher.locator(".little-board-color").count() > 0);
    await teacher.locator(".little-board-color").nth(1).click();
    await range.press("Escape");
    assert.equal(await button(teacher, "画笔").getAttribute("aria-expanded"), "false");
    assert.equal(await button(teacher, "画笔").evaluate(el => el === document.activeElement), true);
    check("native pencil panel, colors, opacity zero and keyboard dismissal");
    await button(teacher, "画笔").click();
    await teacher.mouse.click(5, 5);
    assert.equal(await button(teacher, "画笔").getAttribute("aria-expanded"), "false");
    check("outside pointer dismisses the tool panel");
    await button(teacher, "橡皮擦").click();
    await button(teacher, "局部橡皮擦").click();
    await wait(teacher, () => window.room.state.memberState.currentApplianceName === "pencilEraser");
    assert.equal(await button(teacher, "局部橡皮擦").getAttribute("aria-pressed"), "true");
    await teacher.keyboard.press("Escape");
    await button(teacher, "文字").click();
    await wait(teacher, () => window.room.state.memberState.currentApplianceName === "text");
    await button(teacher, "画笔").click();
    await teacher.keyboard.press("Escape");
    check("native eraser choices and text tool select SDK tools");
    await draw(teacher, 0);
    await wait(teacher, id => {
        const a = window.getManager().queryOne(id);
        return a.appResult.renderControl.getPageInfo(window.room.uid, id, a.appContext.getView().focusScenePath)?.size > 0;
    }, appId);
    await screenshot("question");
    check("teacher draws a real question with mouse input");
    await button(teacher, "发布").click();
    await button(student, "提交").waitFor();
    await wait(student, () => window.room.isWritable);
    await wait(teacher, id => window.getManager().queryOne(id).appResult.studentsStorage.state[window.room.state.roomMembers.find(m => m.payload?.nickName === "Student").payload.uid], appId);
    await wait(student, ({ appId, studentUid }) => {
        const app = window.getManager().queryOne(appId);
        return app.appResult.renderControl.getPageInfo(studentUid, appId, app.appContext.getView().focusScenePath)?.size > 0;
    }, { appId, studentUid });
    assert.ok((await state(student)).answerIds.length > 0, "student inherits the question");
    check("publish starts answering and copies the teacher question to the student page");
    const teacherTab = teacher.getByRole("tab", { name: "Teacher", exact: true });
    await teacherTab.focus();
    await button(student, "画笔").click();
    await button(student, "普通笔").click();
    await student.keyboard.press("Escape");
    await draw(student, 100);
    await wait(student, ({ appId, studentUid }) => {
        const a = window.getManager().queryOne(appId);
        return a.appResult.renderControl.getPageInfo(studentUid, appId, a.appContext.getView().focusScenePath)?.size >= 2;
    }, { appId, studentUid });
    await button(student, "提交").click();
    await wait(teacher, ({ appId, studentUid }) => window.getManager().queryOne(appId).appResult.studentsStorage.state[studentUid]?.isCommit === true, { appId, studentUid });
    await wait(student, () => !window.room.isWritable);
    assert.equal(await button(student, "提交").count(), 0);
    assert.match(await teacher.locator(".little-board-teacher-statistics-board").innerText(), /已提交[\s\S]*Student/);
    assert.equal(await teacherTab.evaluate(el => el === document.activeElement), true, "student storage updates preserve tab focus");
    check("student draws, commits, becomes read only and updates teacher statistics");
    await button(teacher, "结束").click();
    await wait(student, id => window.getManager().queryOne(id).appResult.storage.state.progress === 3, appId);
    await teacherTab.focus();
    await teacherTab.press("ArrowRight");
    assert.equal(await teacher.getByRole("tab", { name: "Student", exact: true }).getAttribute("aria-selected"), "true");
    await button(teacher, "全班展示").click();
    await wait(student, id => window.getManager().queryOne(id).appResult.storage.state.progress === 4, appId);
    await wait(student, ({ appId, studentUid }) => {
        const app = window.getManager().queryOne(appId);
        const scene = app.appContext.getView().focusScenePath;
        const runtime = window.appliancePlugin.currentManager;
        return runtime.collector.getAuthSpaceData()?.pageAuth?.[appId]?.[scene]?.render === studentUid &&
            runtime.renderControl.pageAuth?.get(appId)?.get(scene)?.render === studentUid;
    }, { appId, studentUid });
    check("finish, keyboard tab navigation and show student work to the class");

    const completedAt = Date.now();
    // Check the actual shared page and complete synchronized records after settling.
    for (const delay of [0, 30000, 60000]) {
        const remaining = completedAt + delay - Date.now();
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
        const [left, right] = await Promise.all([state(teacher), state(student)]);
        assert.equal(left.progress, 4); assert.equal(right.progress, 4);
        assert.equal(left.sharedRender, studentUid); assert.equal(right.sharedRender, studentUid);
        assert.equal(left.localRender, studentUid); assert.equal(right.localRender, studentUid);
        assert.ok(left.answerIds.length >= 2 && right.answerIds.length >= 2);
        assert.deepEqual(left.answerIds, right.answerIds);
        assert.equal(canonical(left.data), canonical(right.data));
        assert.equal(canonical(left.students), canonical(right.students));
        report.checkpoints.push({ delay, teacher: left, student: right });
        await screenshot(`shared-${delay / 1000}s`);
        check(`shared answer data and selected page agree at +${delay / 1000}s`);
    }
    // Track document capture listeners added by opening this panel, then close while it is open.
    await teacher.evaluate(() => {
        const add = document.addEventListener;
        const remove = document.removeEventListener;
        const listeners = new Set();
        document.addEventListener = function (type, listener, options) {
            if (type === "pointerdown" && options === true) listeners.add(listener);
            return add.call(this, type, listener, options);
        };
        document.removeEventListener = function (type, listener, options) {
            if (type === "pointerdown" && options === true) listeners.delete(listener);
            return remove.call(this, type, listener, options);
        };
        window.littleBoardPanelListeners = listeners;
    });
    await button(teacher, "画笔").click();
    assert.equal(await teacher.evaluate(() => window.littleBoardPanelListeners.size), 1);
    await teacher.evaluate(id => window.getManager().closeApp(id), appId);
    for (const page of [teacher, student]) {
        await wait(page, id => !window.getManager().queryOne(id), appId);
        assert.equal(await page.locator(".app-litteBoard-container").count(), 0);
    }
    assert.equal(await teacher.evaluate(() => window.littleBoardPanelListeners.size), 0);
    check("closing an open panel removes app DOM and document listeners on both clients");
    await button(teacher, "LittleBoard").click();
    await button(teacher, "发布").waitFor();
    appId = await teacher.evaluate(() => window.getManager().queryAll().find(app => app.kind === "LittleBoard").id);
    await student.getByRole("status").filter({ hasText: "等待老师出题中" }).waitFor();
    await button(teacher, "画笔").click();
    await teacher.keyboard.press("Escape");
    assert.equal(await button(teacher, "画笔").getAttribute("aria-expanded"), "false");
    assert.equal(await teacher.evaluate(() => window.littleBoardPanelListeners.size), 0);
    check("app reopens with working native controls and the student waiting state");
    assert.deepEqual(report.errors, [], "no uncaught browser errors");
    check("no uncaught browser errors");
    report.result = "PASS";
} catch (error) {
    report.result = "FAIL";
    report.failure = String(error.stack || error);
    report.failureStates = await Promise.all(Object.entries(pages).map(async ([role, page]) => ({
        role, state: await state(page).catch(() => undefined),
    })));
    await screenshot("failure").catch(() => {});
    console.error(report.failure);
    process.exitCode = 1;
} finally {
    // Only the app created by this run is closed. Never clear a shared room.
    if (appId && pages.teacher) {
        await pages.teacher.evaluate(id => window.getManager()?.closeApp(id), appId).catch(() => {});
    }
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(`Report: ${path.join(output, "report.json")}`);
}
