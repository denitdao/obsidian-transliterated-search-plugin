import cyrillicToTranslit from 'cyrillic-to-translit-js';
import { App, Notice, Plugin, PluginSettingTab, SearchComponent, Setting, View } from 'obsidian';

interface TransliteratedSearchPluginSettings {
	ukrainian: boolean;
	russian: boolean;
	turnOnByDefault: boolean;
}

const DEFAULT_SETTINGS: TransliteratedSearchPluginSettings = {
	ukrainian: true,
	russian: true,
	turnOnByDefault: true,
}

export default class TransliteratedSearchPlugin extends Plugin {
	settings: TransliteratedSearchPluginSettings;
	statusBarItemEl: HTMLElement;
	ribbonIconEl: HTMLElement;
	isTransliterationEnabled: boolean;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure language settings
		this.addSettingTab(new TransliteratedSearchSettingTab(this.app, this));

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		this.statusBarItemEl = this.addStatusBarItem();

		// This creates an icon in the left ribbon.
		this.ribbonIconEl = this.addRibbonIcon('languages', 'Transliterated Search', (evt: MouseEvent) => {
			if (this.isTransliterationEnabled) {
				this.removeSettingsFromSearchComponent();
				this.defaultGetterOfSearchComponent();
				new Notice('Transliteration is disabled!');
			} else {
				this.applySettingsToSearchComponent();
				this.overrideGetterOfSearchComponent();
				new Notice('Transliteration is enabled!');
			}
		});

		// Load plugin on startup if required
		this.observeSearchPanelLoaded();
	}

	onunload() {
		// Returning everything to the default
		this.removeSettingsFromSearchComponent();
		this.defaultGetterOfSearchComponent();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.applySettingsToSearchComponent();
	}

	/**
	 * Loads transliteration plugin on startup if required.
	 * Uses observer to detect when the search panel is loaded.
	 */
	private observeSearchPanelLoaded(): void {
		const observer = new MutationObserver(mutations => {
			if (document.querySelector('.search-input-container')) {
				observer.disconnect();
				if (this.settings.turnOnByDefault) {
					console.log("Enabling transliteration on startup");
					this.getSearchComponent().then((searchComponent) => {
						searchComponent.inputEl.value = "";
					});
					this.applySettingsToSearchComponent();
					this.overrideGetterOfSearchComponent();
				}
			}
		});
		observer.observe(document.body, { attributes: true, childList: true, subtree: true });
	}

	/**
	 * Overrides search component getter to add transliteration.
	 * Method {@code getValue} is called by the core Search plugin to get the search query.
	 * This method is overridden and appended with transliterated terms.
	 * Enables transliteration.
	 */
	private overrideGetterOfSearchComponent(): void {
		this.getSearchComponent().then((searchComponent) => {
			searchComponent.getValue = function () {
				const t = this as ModifiedSearchComponent;
				const userInput: string = t.inputEl.value ?? "";
				if (userInput == "") return "";

				const termSet: Set<string> = new Set();
				termSet.add(userInput);

				if (t.translitRU) {
					const ru_en = t.translitRU.transform(userInput).toLowerCase();
					const en_ru = t.translitRU.reverse(userInput).toLowerCase();
					termSet.add(ru_en);
					termSet.add(en_ru);
				}
				if (t.translitUK) {
					const uk_en = t.translitUK.transform(userInput).toLowerCase();
					const en_uk = t.translitUK.reverse(userInput).toLowerCase();
					termSet.add(uk_en);
					termSet.add(en_uk);
				}
				const transliteratedInput = Array.from(termSet).join(" OR ");

				return transliteratedInput;
			}
			this.updateTransliterationStatus(true);
		});
	}

	/**
	 * Returns the search component getter to the default.
	 * Disables transliteration.
	 */
	private defaultGetterOfSearchComponent(): void {
		this.getSearchComponent().then((searchComponent) => {
			searchComponent.getValue = function () {
				const t = this as ModifiedSearchComponent;
				return t.inputEl.value;
			}
			this.updateTransliterationStatus(false);
		});
	}

	/**
	 * This function initializes search component with transliteration settings.
	 */
	private applySettingsToSearchComponent(): void {
		this.getSearchComponent().then((searchComponent) => {
			searchComponent.translitRU = this.settings.russian ? cyrillicToTranslit({ preset: 'ru' }) : undefined;
			searchComponent.translitUK = this.settings.ukrainian ? cyrillicToTranslit({ preset: 'uk' }) : undefined;
		});
	}

	/**
	 * This function removes transliteration settings from search component.
	 * This is needed to return the search component to the default state.
	 */
	private removeSettingsFromSearchComponent(): void {
		this.getSearchComponent().then((searchComponent) => {
			searchComponent.translitRU = undefined;
			searchComponent.translitUK = undefined;
		});
	}

	/**
	 * Function to update the status of the transliteration.
	 * Also updates the status bar and ribbon icon.
	 * @param isEnabled - boolean value to set the status of the transliteration
	 */
	private updateTransliterationStatus(isEnabled: boolean): void {
		this.isTransliterationEnabled = isEnabled;
		this.updateStatusBar(isEnabled ? 'Transliteration On' : 'Transliteration Off');
		if (isEnabled)
			this.ribbonIconEl.addClass('is-active');
		else
			this.ribbonIconEl.removeClass('is-active');
	}

	private updateStatusBar(text: string): void {
		this.statusBarItemEl.setText(text);
	}

	/**
	 * Function to get the native searchComponent from the core Search panel
	 * @returns searchComponent from search panel
	 */
	private getSearchComponent(): ModifiedSearchComponent {
		const searchPanel: CoreSearchPanel = this.app.workspace.getLeavesOfType('search')[0]?.view as CoreSearchPanel;
		return searchPanel.searchComponent;
	}
	// TODO: try to make this work in async way
	// private getSearchComponent(): Promise<ModifiedSearchComponent> {
	// 	return new Promise<ModifiedSearchComponent>((resolve) => {
	// 		const searchPanel: CoreSearchPanel = this.app.workspace.getLeavesOfType('search')[0]?.view as CoreSearchPanel;
	// 		if (searchPanel && searchPanel.searchComponent) {
	// 			return resolve(searchPanel.searchComponent);
	// 		}
	// 	});
	// }
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
					this.plugin.settings.ukrainian = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Transliterate russian')
			.setDesc('If checked, the plugin will transliterate russian characters.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.russian)
				.onChange(async (value) => {
					this.plugin.settings.russian = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Turn on by default')
			.setDesc('If checked, the plugin will be activated each time you open obsidian. NOTE: will clear search input on startup.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.turnOnByDefault)
				.onChange(async (value) => {
					this.plugin.settings.turnOnByDefault = value;
					await this.plugin.saveSettings();
				}));
	}
}


// OBSIDIAN UI COMPONENT INTERFACES
interface CoreSearchPanel extends View {
	searchComponent: ModifiedSearchComponent;
}

interface ModifiedSearchComponent extends SearchComponent {
	translitRU: undefined | any;
	translitUK: undefined | any;
}
