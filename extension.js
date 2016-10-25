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

    let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
    let icon = new St.Icon({icon_name: 'dialog-password-symbolic', style_class: 'system-status-icon'});

    hbox.add_child(icon);
    this.actor.add_actor(hbox);
    Main.panel.addToStatusArea('passwordManager', this);
    this._draw_directory();
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

    let cmd = "ls -l .password-store/"+this._current_directory;
    let [res, out, err, status] = GLib.spawn_command_line_sync(cmd);
    let data = out.toString().split("\n").slice(1).map(element => ({
      directory: element[0] === 'd',
      name: element.split(" ").slice(-1)[0],
    })).filter(element => element.name !== "")
    .sort(function(a, b) {
      if (a.directory && !b.directory) {
        return -1;
      }else if (b.directory && !a.directory) {
        return 1;
      } else {
        return a.name > b.name;
      }
    });
    data.forEach(element => {
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
          let cmd2 = "pass -c "+this._current_directory+name;
          let out = GLib.spawn_command_line_async(cmd2);
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
  serviceManager.destroy();
}
