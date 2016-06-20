const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter;


const SeparatorMenuItem = new Lang.Class({
  Name: 'SeparatorMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,
  _init: function (text) {
    this.parent({ reactive: false, can_focus: false});
    this._separator = new St.Widget({ style_class: 'popup-separator-menu-item',
                                      y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
    this.actor.add(this._separator, { expand: true });
  },
});

const PasswordManager = new Lang.Class({
  Name: 'PasswordManager',
  Extends: PanelMenu.Button,
  _current_directory: './',

  _init: function() {
    PanelMenu.Button.prototype._init.call(this, 0.0);

    let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
    let icon = new St.Icon({icon_name: 'system-run-symbolic', style_class: 'system-status-icon'});

    hbox.add_child(icon);
    this.actor.add_actor(hbox);
    Main.panel.addToStatusArea('passwordManager', this);
    this._draw_directory();
  },

  _draw_directory: function(){
    let item = new PopupMenu.PopupMenuItem(this._current_directory);
    this.menu.addMenuItem(item);
    this.menu.addMenuItem(new SeparatorMenuItem());

    let cmd = "ls -l .password-store/"+this._current_directory;
    let [res, out, err, status] = GLib.spawn_command_line_sync(cmd);
    let data = out.toString().split("\n").slice(1).map(element => ({
      directory: element[0] === 'd',
      name: element.split(" ").slice(-1)[0],
    }));
    data.forEach(element => {
      let menuElement = element.directory ?
        new PopupMenu.PopupSubMenuMenuItem(element.name) :
        new PopupMenu.PopupMenuItem(element.name);
      this.menu.addMenuItem(menuElement);
    });
  }
});

let passwordManager;

function enable() {
  passwordManager = new PasswordManager();
}

function disable() {
  serviceManager.destroy();
}
