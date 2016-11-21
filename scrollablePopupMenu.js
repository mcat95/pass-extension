const BoxPointer = imports.ui.boxpointer;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

const ScrollablePopupMenu = new Lang.Class({
    Name: 'ScrollablePopupMenu',
    Extends: PopupMenu.PopupMenu,
    bottomSection: null,

    _init: function(sourceActor, arrowAlignment, arrowSide) {
        PopupMenu.PopupMenuBase.prototype._init.call(this, sourceActor, 'popup-menu-content');
        this._arrowAlignment = arrowAlignment;
        this._arrowSide = arrowSide;

        this._boxPointer = new BoxPointer.BoxPointer(arrowSide, {
            x_fill: true,
            y_fill: true,
            x_align: St.Align.START
        });
        this.actor = this._boxPointer.actor;

        this.scroller = new St.ScrollView({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
        });

        this.boxlayout = new St.BoxLayout({
            vertical: true,
        });

        this.scroller.add_actor(this.box);
        this.boxlayout.add(this.scroller);

        this._addBottomSection();

        this.actor._delegate = this;
        this.actor.style_class = 'popup-menu-boxpointer';

        this._boxPointer.bin.set_child(this.boxlayout);
        this.actor.add_style_class_name('popup-menu');

        this.box.set_style('padding-bottom: 0');
        global.focus_manager.add_group(this.actor);
        this.actor.reactive = true;

        this._openedSubMenu = null;
        this._childMenus = [];
    },

    _addBottomSection: function() {
        this.bottomSection = new St.BoxLayout({
            vertical: true,
            style_class: 'bottomSection'
        });
        this.boxlayout.add(this.bottomSection);
    },

    clearBottomSection: function() {
        if (this.bottomSection !== null) {
            this.bottomSection.destroy();
        }
        this._addBottomSection();
    },

    isEmpty: function() {
        let bottomHasVisibleChildren = this.bottomSection.get_children().some(function(child) {
            return child.visible;
        });
        return !bottomHasVisibleChildren && PopupMenu.PopupMenuBase.prototype.isEmpty.call(this);
    },

    _getHeight: function(preferred, parent_before, parent_after) {
        if ((preferred < parent_after) && (parent_before != parent_after)) {
            return preferred;
        }
        let diff = parent_after - parent_before;
        let third = Math.floor(parent_after / 3);
        if (diff > 0) {
            if (third > diff) {
                return third;
            }
            return diff;
        }
        if (preferred < third) {
            return preferred;
        }
        return third;
    },

    addMenuItem: function(menuItem, position) {
        this.parent(menuItem, position);
        if (menuItem instanceof PopupMenu.PopupSubMenuMenuItem) {
            let menu = menuItem.menu;
            menu.connect('open-state-changed', Lang.bind(this, function(item, open) {
                if (open === true) {
                    let parent_preferred_height_before =
                        menu._parent.actor.get_preferred_height(-1)[1];
                    menu.actor.show();
                    let parent_preferred_height = menu._parent.actor.get_preferred_height(-1)[1];
                    menu.actor.hide();
                    let preferred_height = menu.actor.get_preferred_height(-1)[1];

                    menu.actor.set_height(this._getHeight(preferred_height,
                        parent_preferred_height_before, parent_preferred_height));
                }
            }));
        }
    }
});

/* vi: set expandtab tabstop=4 shiftwidth=4: */
