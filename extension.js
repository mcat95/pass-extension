const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;

const PasswordManager = new Lang.Class({
  Name: 'PasswordManager',
  Extends: PanelMenu.Button,

  _init: function() {
    PanelMenu.Button.prototype._init.call(this, 0.0);

    let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
    let icon = new St.Icon({icon_name: 'system-run-symbolic', style_class: 'system-status-icon'});
    hbox.add_child(icon);

    this.actor.add_actor(hbox);
    this.actor.add_style_class_name('panel-status-button');

    Main.panel.addToStatusArea('passwordManager', this);

    let item = new PopupMenu.PopupMenuItem("This is a test");
    this.menu.addMenuItem(item);
  },
});

let passwordManager;

function enable() {
  passwordManager = new PasswordManager();
}

function disable() {
  serviceManager.destroy();
}
