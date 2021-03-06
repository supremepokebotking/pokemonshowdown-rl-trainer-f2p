"use strict";Object.defineProperty(exports, "__esModule", {value: true}); const Abilities = {
	aerilate: {
		inherit: true,
		onBasePower(basePower, pokemon, target, move) {
			if (move.aerilateBoosted) return this.chainModify([0x14CD, 0x1000]);
		},
		rating: 4.5,
	},
	aftermath: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.flags['contact'] && !target.hp) {
				this.damage(source.baseMaxhp / 4, source, target, null, true);
			}
		},
	},
	galewings: {
		inherit: true,
		onModifyPriority(priority, pokemon, target, move) {
			if (move && move.type === 'Flying') return priority + 1;
		},
		rating: 4,
	},
	ironbarbs: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.flags['contact']) {
				this.damage(source.baseMaxhp / 8, source, target, null, true);
			}
		},
	},
	liquidooze: {
		inherit: true,
		onSourceTryHeal(damage, target, source, effect) {
			this.debug("Heal is occurring: " + target + " <- " + source + " :: " + effect.id);
			const canOoze = ['drain', 'leechseed'];
			if (canOoze.includes(effect.id)) {
				this.damage(damage, null, null, null, true);
				return 0;
			}
		},
	},
	magicguard: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (effect.effectType !== 'Move') return false;
		},
	},
	normalize: {
		inherit: true,
		onModifyMovePriority: 1,
		onModifyMove(move) {
			if (move.id !== 'struggle' && this.dex.getMove(move.id).type !== 'Normal') {
				move.type = 'Normal';
			}
		},
		rating: -1,
	},
	parentalbond: {
		inherit: true,
		onBasePower(basePower, pokemon, target, move) {
			if (move.multihitType === 'parentalbond' && move.hit > 1) return this.chainModify(0.5);
		},
		rating: 5,
	},
	pixilate: {
		inherit: true,
		onBasePower(basePower, pokemon, target, move) {
			if (move.pixilateBoosted) return this.chainModify([0x14CD, 0x1000]);
		},
		rating: 4.5,
	},
	refrigerate: {
		inherit: true,
		onBasePower(basePower, pokemon, target, move) {
			if (move.refrigerateBoosted) return this.chainModify([0x14CD, 0x1000]);
		},
		rating: 4.5,
	},
	roughskin: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.flags['contact']) {
				this.damage(source.baseMaxhp / 8, source, target, null, true);
			}
		},
	},
	stancechange: {
		inherit: true,
		onBeforeMovePriority: 11,
	},
	weakarmor: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Physical') {
				this.boost({def: -1, spe: 1}, target, target);
			}
		},
		rating: 0.5,
	},
	zenmode: {
		inherit: true,
		isPermanent: false,
	},
}; exports.Abilities = Abilities;
