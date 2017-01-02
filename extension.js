const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Shell = imports.gi.Shell;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const ScrollablePopupMenu = Me.imports.scrollablePopupMenu.ScrollablePopupMenu;
const Convenience = Me.imports.convenience;
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter;

const IconMenuItem = new Lang.Class({
  Name: 'IconMenuItem',
  Extends: PopupMenu.PopupMenuItem,
  _init: function (icon_name, text) {
    this.parent(text);
    let icon = new St.Icon({icon_name: icon_name, icon_size: 25});
    this.actor.insert_child_at_index(icon,1);
  },
});

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

    let popupMenu = new ScrollablePopupMenu(this.actor, St.Align.START, St.Side.TOP);
    this.setMenu(popupMenu);

    let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
    let icon = new St.Icon({icon_name: 'dialog-password-symbolic', style_class: 'system-status-icon'});

    hbox.add_child(icon);
    this.actor.add_actor(hbox);
    Main.panel.addToStatusArea('passwordManager', this);
    this._draw_directory();

    Main.wm.addKeybinding(
      "show-menu-keybinding",
      Convenience.getSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      () => {
        popupMenu.open();
        popupMenu.box.get_children()[0].grab_key_focus();
      }
    );
  },

  _draw_directory: function(){
    this.menu.removeAll();
    let item = new PopupMenu.PopupMenuItem(this._current_directory);
    item.connect('activate', Lang.bind(this, function() {
      if(this._current_directory !== "./")
        this._current_directory = this._current_directory.split("/").slice(0,-2).join("/") + "/"
      this._draw_directory();
    }));
    this.menu.addMenuItem(item);
    this.menu.addMenuItem(new SeparatorMenuItem());

    let fd = Gio.file_new_for_path(".password-store/"+this._current_directory);
    let enumerator = fd.enumerate_children("standard::*", 0, null);
    let data = [];
    var entry;
    while (entry = enumerator.next_file(null)) {
      if (entry.get_name()[0] == '.')
        continue;
      data.push({
        directory: entry.get_file_type() == Gio.FileType.DIRECTORY,
        name: entry.get_name(),
      });
    }
    data.sort(function(a, b) {
      if (a.directory && !b.directory) {
        return -1;
      } else if (b.directory && !a.directory) {
        return 1;
      } else {
        return a.name > b.name;
      }
    }).forEach(element => {
      let menuElement;
      if(element.directory){
        menuElement = new IconMenuItem('folder', element.name+"/");
        menuElement.connect('activate', Lang.bind(this, function() {
          this._current_directory+=element.name+"/";
          this._draw_directory();
        }));
      }else{
        let name = element.name.split(".").slice(0,-1).join(".");
        menuElement = new IconMenuItem('channel-secure',name);
        menuElement.connect('activate', Lang.bind(this, function() {
          let out = GLib.spawn_async(
            null,
            ['pass', '-c', this._current_directory + name],
            null,
            GLib.SpawnFlags.SEARCH_PATH,
            null
          );
          log(out);
        }));
      }
      this.menu.addMenuItem(menuElement);
    });
  }
});

let passwordManager;

function enable() {
  passwordManager = new PasswordManager();
}

function disable() {
  Main.wm.removeKeybinding("show-menu-keybinding");
  passwordManager.destroy();
}
