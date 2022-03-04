import {ipcMain} from 'electron';
import {initIpc} from '../ipc';
import {loadPrefs} from '../prefs';
import {openWithTempFile} from '../open-with-temp-file';
import {saveJsonFile} from '../json-file';
import {
	deleteStory,
	loadStories,
	renameStory,
	saveStoryHtml
} from '../story-file';
import {Story} from '../../../store/stories';
import {fakePendingStoryFormat, fakePrefs, fakeStory} from '../../../test-util';
import {loadStoryFormats} from '../story-formats';

jest.mock('../json-file');
jest.mock('../prefs');
jest.mock('../open-with-temp-file');
jest.mock('../story-file');
jest.mock('../story-formats');

describe('initIpc()', () => {
	const deleteStoryMock = deleteStory as jest.Mock;
	const loadPrefsMock = loadPrefs as jest.Mock;
	const handleMock = ipcMain.handle as jest.Mock;
	const loadStoriesMock = loadStories as jest.Mock;
	const loadStoryFormatsMock = loadStoryFormats as jest.Mock;
	const onMock = ipcMain.on as jest.Mock;
	const openWithTempFileMock = openWithTempFile as jest.Mock;
	const renameStoryMock = renameStory as jest.Mock;
	const saveJsonFileMock = saveJsonFile as jest.Mock;
	const saveStoryHtmlMock = saveStoryHtml as jest.Mock;

	beforeEach(() => {
		saveStoryHtmlMock.mockResolvedValue(undefined);
		initIpc();
	});

	describe('the listener it adds for delete-story events', () => {
		let listener: any[];
		let story: Story;

		beforeEach(() => {
			listener = onMock.mock.calls.find(call => call[0] === 'delete-story');
			story = fakeStory();
		});

		it('calls deleteStory()', async () => {
			expect(listener).not.toBeUndefined();
			listener[1]({sender: {send: jest.fn()}}, story);
			expect(deleteStoryMock).toBeCalledWith(story);
		});

		it('sends back a story-deleted event', async () => {
			const send = jest.fn();

			expect(listener).not.toBeUndefined();
			await listener[1]({sender: {send}}, story, 'test-story-html');
			expect(send.mock.calls).toEqual([['story-deleted', story]]);
		});
	});

	describe('the handler it adds for load-prefs events', () => {
		it('returns the value of loadPrefs() if it does not throw', async () => {
			const prefs = fakePrefs();
			loadPrefsMock.mockReturnValue(prefs);

			let listener = handleMock.mock.calls.find(
				call => call[0] === 'load-prefs'
			);

			expect(listener).not.toBeUndefined();
			expect(await listener[1]()).toEqual(prefs);
			expect(loadPrefsMock).toBeCalledTimes(1);
		});

		it('returns an empty object if loadPrefs() throws an error', async () => {
			jest.spyOn(console, 'warn').mockReturnValue();
			loadPrefsMock.mockImplementation(() => {
				throw new Error();
			});

			let listener = handleMock.mock.calls.find(
				call => call[0] === 'load-prefs'
			);

			expect(listener).not.toBeUndefined();
			expect(await listener[1]()).toEqual({});
		});
	});

	it('adds a handler for load-stories that calls loadStories()', async () => {
		const stories = [fakeStory(), fakeStory()];

		loadStoriesMock.mockReturnValue(stories);

		let listener = handleMock.mock.calls.find(
			call => call[0] === 'load-stories'
		);

		expect(await listener[1]()).toEqual(stories);
		expect(loadStoriesMock).toBeCalledTimes(1);
	});

	describe('the handler it adds for load-story-formats events', () => {
		it('returns the value of loadStoryFormats() if it does not throw', async () => {
			const formats = [fakePendingStoryFormat(), fakePendingStoryFormat()];

			loadStoryFormatsMock.mockReturnValue(formats);

			let listener = handleMock.mock.calls.find(
				call => call[0] === 'load-story-formats'
			);

			expect(listener).not.toBeUndefined();
			expect(await listener[1]()).toEqual(formats);
			expect(loadStoryFormatsMock).toBeCalledTimes(1);
		});

		it('returns an empty array if loadStoryFormats() throws an error', async () => {
			jest.spyOn(console, 'warn').mockReturnValue();
			loadStoryFormatsMock.mockImplementation(() => {
				throw new Error();
			});

			let listener = handleMock.mock.calls.find(
				call => call[0] === 'load-story-formats'
			);

			expect(listener).not.toBeUndefined();
			expect(await listener[1]()).toEqual([]);
		});
	});

	it('adds a listener for open-with-temp-files events that calls openWithTempFile()', async () => {
		const listener = onMock.mock.calls.find(
			call => call[0] === 'open-with-temp-file'
		);

		expect(listener).not.toBeUndefined();
		listener[1]({}, 'test-file-contents', 'test-file-suffix');
		expect(openWithTempFileMock).toBeCalledWith(
			'test-file-contents',
			'test-file-suffix'
		);
	});

	describe('the listener it adds for rename-story events', () => {
		let listener: any[];
		let newStory: Story;
		let oldStory: Story;

		beforeEach(() => {
			listener = onMock.mock.calls.find(call => call[0] === 'rename-story');
			oldStory = fakeStory();
			newStory = {...oldStory, name: 'new-name'};
		});

		it('calls renameStory()', async () => {
			expect(listener).not.toBeUndefined();
			listener[1]({sender: {send: jest.fn()}}, oldStory, newStory);
			expect(renameStoryMock.mock.calls).toEqual([[oldStory, newStory]]);
		});

		it('sends back a story-renamed event', async () => {
			const send = jest.fn();

			expect(listener).not.toBeUndefined();
			await listener[1]({sender: {send}}, oldStory, newStory);
			expect(send.mock.calls).toEqual([['story-renamed', oldStory, newStory]]);
		});
	});

	it('adds a listener for save-json events that calls openWithTempFile()', async () => {
		const listener = onMock.mock.calls.find(call => call[0] === 'save-json');
		const testData = {};

		expect(listener).not.toBeUndefined();
		listener[1]({}, 'test-filename', testData);
		expect(saveJsonFileMock).toBeCalledWith('test-filename', testData);
	});

	describe('the listener it adds for save-story-html events', () => {
		let listener: any[];
		let story: Story;

		beforeEach(() => {
			jest.spyOn(console, 'log').mockReturnValue();
			listener = onMock.mock.calls.find(call => call[0] === 'save-story-html');
			story = fakeStory();
		});

		it('calls saveStoryHtml()', async () => {
			expect(listener).not.toBeUndefined();
			await listener[1]({sender: {send: jest.fn()}}, story, 'test-story-html');
			expect(saveStoryHtmlMock).toBeCalledWith(story, 'test-story-html');
		});

		it('queues calls to saveStoryHtml() for the same story ID', async () => {
			saveStoryHtmlMock.mockImplementation(() => new Promise(() => {}));
			listener[1]({sender: {send: jest.fn()}}, story, 'test-story-html');
			listener[1]({sender: {send: jest.fn()}}, story, 'test-story-html');
			await Promise.resolve();
			await Promise.resolve();
			expect(saveStoryHtmlMock).toBeCalledTimes(1);
		});

		it("doesn't queue calls to saveStoryHtml() for the different story IDs", async () => {
			const story1 = fakeStory();
			const story2 = fakeStory();

			story1.id = 'mock-id-1';
			story2.id = 'mock-id-2';

			saveStoryHtmlMock.mockImplementation(() => new Promise(() => {}));
			listener[1]({sender: {send: jest.fn()}}, story1, 'test-story-html');
			listener[1]({sender: {send: jest.fn()}}, story2, 'test-story-html');
			await Promise.resolve();
			await Promise.resolve();
			expect(saveStoryHtmlMock).toBeCalledTimes(2);
		});

		it('sends back a story-html-saved event', async () => {
			const send = jest.fn();

			expect(listener).not.toBeUndefined();
			await listener[1]({sender: {send}}, story, 'test-story-html');
			expect(send.mock.calls).toEqual([['story-html-saved', story]]);
		});

		it('rejects if asked to save an empty string', async () => {
			expect(listener).not.toBeUndefined();
			await expect(
				listener[1]({sender: {send: jest.fn()}}, story, '')
			).rejects.toBeInstanceOf(Error);
			expect(saveStoryHtmlMock).not.toHaveBeenCalled();
		});

		it('rejects if asked to save a non-string', async () => {
			expect(listener).not.toBeUndefined();
			await expect(
				listener[1]({sender: {send: jest.fn()}}, story, null)
			).rejects.toBeInstanceOf(Error);
			expect(saveStoryHtmlMock).not.toHaveBeenCalled();
			await expect(
				listener[1]({sender: {send: jest.fn()}}, story, undefined)
			).rejects.toBeInstanceOf(Error);
			expect(saveStoryHtmlMock).not.toHaveBeenCalled();
			await expect(
				listener[1]({sender: {send: jest.fn()}}, story, false)
			).rejects.toBeInstanceOf(Error);
			expect(saveStoryHtmlMock).not.toHaveBeenCalled();
			await expect(
				listener[1](
					{sender: {send: jest.fn()}},
					story,
					Promise.resolve('some html')
				)
			).rejects.toBeInstanceOf(Error);
			expect(saveStoryHtmlMock).not.toHaveBeenCalled();
		});
	});
});
