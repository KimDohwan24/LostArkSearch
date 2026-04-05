import https from 'https';
const urls = [
'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/skill/skill_blade_identity_1.png',
'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/skill/skill_blade_identity_01.png',
'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/skill/blade_identity_01.png',
'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/skill/blade_identity_1.png',
'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/skill/blade_burst.png',
'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/skill/burst.png'
];

urls.forEach(u => {
    https.get(u, (res) => {
        if (res.statusCode === 200) console.log("FOUND:", u);
    });
});
