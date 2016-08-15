# Passwordstore gnome manager

**Important**: The extension requires you to have properly installed and configured pass

Gnome-shell extension to access your passwords from the password store [pass](https://www.passwordstore.org/).

### Installing

The recommended method of instalation is using the gnome shell extensions website. Just go [here](https://extensions.gnome.org/extension/1093/passwordstore-manager/) and install the extension.

You can also install the extension manually, by cloning the repository in
`.local/share/gnome-shell/extensions` and rename it with the name "passwordstore@mcat95.gmail.com"

You can do that with the following command:
```
git clone git@github.com:mcat95/pass-extension.git ~/.local/share/gnome-shell/extensions/passwordstore@mcat95.gmail.com
```
You may have to open gnome-tweak-tool and enable the extension.

## How it works
- Click on a folder to open it
- Click on an item to copy the password into the clipboard
- Click on the current path to go up a level

## Contributing
The extension is still in a very early phase, but PR's and issues are appreciated :D
