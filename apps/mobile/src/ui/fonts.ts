// The UI fonts, bundled with the app (static instances of the Google Fonts files the web app serves; OFL notices
// next to them). Loaded under the family names `tokens.fonts` uses.
import { fonts } from "./tokens";

export const fontAssets = {
	[fonts.ui[400]]: require("../../assets/fonts/HankenGrotesk-Regular.ttf"),
	[fonts.ui[500]]: require("../../assets/fonts/HankenGrotesk-Medium.ttf"),
	[fonts.ui[600]]: require("../../assets/fonts/HankenGrotesk-SemiBold.ttf"),
	[fonts.ui[700]]: require("../../assets/fonts/HankenGrotesk-Bold.ttf"),
	[fonts.display[400]]: require("../../assets/fonts/Newsreader-Regular.ttf"),
	[fonts.display[500]]: require("../../assets/fonts/Newsreader-Medium.ttf"),
	[fonts.display[600]]: require("../../assets/fonts/Newsreader-SemiBold.ttf"),
};
