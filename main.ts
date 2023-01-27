import CyrillicToTranslit from 'cyrillic-to-translit-js';
import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface TransliteratedSearchPluginSettings {
	ukrainian: boolean;
	russian: boolean;
	defaultState: boolean;
}

const DEFAULT_SETTINGS: TransliteratedSearchPluginSettings = {
	ukrainian: true,
	russian: true,
	defaultState: false
}

export default class TransliteratedSearchPlugin extends Plugin {
	settings: TransliteratedSearchPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('languages', 'Transliterated Search Plugin', (evt: MouseEvent) => {
			// console.log('plugin: ', (this.app as any).internalPlugins.getPluginById("global-search"));

			const searchPanel = this.app.workspace.getLeavesOfType('search')[0]?.view;
			// console.log('searchComponent: ', searchPanel.searchComponent);

			searchPanel.searchComponent.translitRU = this.settings.russian ? CyrillicToTranslit({ preset: 'ru' }) : null;
			searchPanel.searchComponent.translitUK = this.settings.ukrainian ? CyrillicToTranslit({ preset: 'uk' }) : null;

			// Overriding existing global-search function
			searchPanel.searchComponent.getValue = function () {
				// console.log('original input: ', this.inputEl.value);
				const userInput: string = this.inputEl.value ?? "";
				if (userInput == "") return "";

				const termSet: Set<string> = new Set();
				termSet.add(userInput);

				if (this.translitRU) {
					const ru_en = this.translitRU.transform(userInput).toLowerCase();
					const en_ru = this.translitRU.reverse(userInput).toLowerCase();
					termSet.add(ru_en);
					termSet.add(en_ru);
				}
				if (this.translitUK) {
					const uk_en = this.translitUK.transform(userInput).toLowerCase();
					const en_uk = this.translitUK.reverse(userInput).toLowerCase();
					termSet.add(uk_en);
					termSet.add(en_uk);
				}
				const transliteratedInput = Array.from(termSet).join(" OR ");

				console.log('transliterated input: ', transliteratedInput);

				return transliteratedInput;
			}

			new Notice('Transliteration is enabled!');
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TransliteratedSearchSettingTab(this.app, this));

		/* this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			const targetEl = evt.target;

			if (!(targetEl instanceof HTMLElement)) {
				return;
			}

			if (targetEl instanceof HTMLInputElement) {
				const searchPanel = this.app.workspace.getLeavesOfType('search')[0]?.view;

				if (searchPanel.containerEl.contains(targetEl)) {
					if (!this.isBuiltInElementToOpenFile(targetEl)){
						return;
					}
					console.log('input: ', targetEl.value);
					console.log('targetEl:', targetEl);
					console.dir(targetEl);
				}
			}
		}); */

		// event on search bar input
		this.registerDomEvent(document, 'input', (evt: InputEvent) => {
			// const searchPanel = this.app.workspace.getLeavesOfType('search')[0]?.view;
			// console.log('search query: ', searchPanel.searchQuery);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		const searchPanel = this.app.workspace.getLeavesOfType('search')[0]?.view;
		searchPanel.searchComponent.translitRU = this.settings.russian ? CyrillicToTranslit({ preset: 'ru' }) : null;
		searchPanel.searchComponent.translitUK = this.settings.ukrainian ? CyrillicToTranslit({ preset: 'uk' }) : null;
	}

/* 	
	searchComponent - div class="search-input-container"
	                    var o = this.searchComponent.getValue()
	                  , r = this.app.internalPlugins.getPluginById("global-search");
	               var i = this.info.app.internalPlugins.getPluginById("global-search");
	               i && i.instance.openGlobalSearch("tag:" + n)
	q: how to run n.startSearch() from the internalPlugins.getPluginById("global-search")?
	a: i.instance.startSearch()    ----  are they close to each other 
*/
}

class TransliteratedSearchSettingTab extends PluginSettingTab {
	plugin: TransliteratedSearchPlugin;

	constructor(app: App, plugin: TransliteratedSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for transliterated search plugin.' });

		new Setting(containerEl)
			.setName('Transliterate Ukrainian')
			.setDesc('If checked, the plugin will transliterate Ukrainian characters.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ukrainian)
				.onChange(async (value) => {
					console.log('Transliterate Ukrainian: ' + value);
					this.plugin.settings.ukrainian = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Transliterate russian')
			.setDesc('If checked, the plugin will transliterate russian characters.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.russian)
				.onChange(async (value) => {
					console.log('Transliterate russian: ' + value);
					this.plugin.settings.russian = value;
					await this.plugin.saveSettings();
				}));
	}
}
