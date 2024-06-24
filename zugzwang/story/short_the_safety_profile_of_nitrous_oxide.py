import os
import textwrap
from typing import List

import requests

from zugzwang.models import Narration, Scene
from zugzwang.openai import generate_image


data_dir = os.path.join("data")

width = 1080
height = 1920

voice_id = "EODKX28NbkUPd7QWJ7yr"
scenes = []


def get_narration(text: str):
    text = text.rstrip().lstrip()
    text = textwrap.dedent(text)
    return Narration(text, voice_id=voice_id)


def add_scene(name: str, narration: str, media_filepath: str) -> Scene:
    scene = Scene(name=name, narration=get_narration(narration), media_filepath=media_filepath)
    scenes.append(scene)
    return scene


def generate_images(scenes: List[Scene], output_dir: str):
    prompt = """
        We are creating a visual aid which will be accompanied by the following narration.
        Modify the prompt as much as necessary to ensure the image will not violate the OpenAI use case policy.
        Generate a simple image that will help illustrate the following text:
    """
    prompt = prompt.rstrip().lstrip()
    prompt = textwrap.dedent(prompt)

    os.makedirs(output_dir, exist_ok=True)
    for i, scene in enumerate(scenes):
        text = scene.narration.text.rstrip().lstrip()
        text = textwrap.dedent(text)
        image_url = generate_image(prompt=prompt, text=text)
        if not image_url:
            continue

        image = requests.get(image_url).content
        with open(os.path.join(output_dir, f"{i}.png"), "wb") as f:
            f.write(image)


add_scene(
    name="Short: The Safety Profile of Nitrous Oxide",
    narration="""
        It is an oft cited misconception that Nitrous Oxide is an extremely harmful and risky drug because all "Inhalants" cause severe organ damage. This is simply a myth and it's about time to set the record straight.
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/42901218-8dfc-4af1-bdeb-158322dfedfb/file-5NKAalokMFMah4u93orNL5bL.png?format={width}w",
)

add_scene(
    name="Risk Factors of Nitrous",
    narration="""
        Nitrous has a few routes of risk / potential risk, I'll list them out and go over each.
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/42901218-8dfc-4af1-bdeb-158322dfedfb/file-5NKAalokMFMah4u93orNL5bL.png?format={width}w",
)

add_scene(
    name="1) Olney's Lesions (Debunked)",
    narration="""
        Nitrous was originally hypothesized to cause Olney's lesions in the brain. In fact, almost all dissociatives were thought to cause this including ketamine, pcp, and numerous other arylcyclohexylamines.
        However, over decades of consistent research and clinical trials and FDA approvals, we've not found a single piece of evidence that dissociatives cause Olney's lesions in humans. We've only seen evidence of this in some other species. Ketamine is an approved anesthetic and is gradually gaining acceptance as a highly effective drug for treatment resistant depression. We've proven that dissociatives don't cause Olney's lesions to a satisfactory extent.
        The original fears came from some animal trials done a few decades back. It's not that uncommon for animal testing results to end up not being cross applicable to humans. Despite this, it was obviously still good to be safe rather than sorry, so I'm glad that countless folks in the scientific community have put in the work to conclusively rule out this risk factor.
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/1fd89997-3a34-4f06-8c7b-872aa05dc954/olneyslesions.jpg?format={width}w",
)

add_scene(
    name="2) Asphyxiation (Easily Avoidable User Error)",
    narration="""
        Asphyxiation is an often cited myth for how nitrous causes its high. In fact, nitrous does not rely on hypoxia for its subjective effects. Nitrous oxide is an NMDA receptor antagonist, similar to most other dissociatives such as Ketamine, PCP, O-PCE, DCK, etc, and does not require any oxygen starvation to produce its characteristic effects.
        Now, hypoxia is actually an intensely psychoactive state on its own right, and it is also possible to use nitrous incorrectly or irresponsibly leading to oxygen starvation and asphyxiation. So it is definitely true that some people's nitrous experiences have been partially caused by the oxygen deprivation high. But even if you've heard many stories of people doing this or even know people yourself who take nitrous this way, know that this is absolutely NOT A RESPONSIBLE NOR THE INTENDED WAY TO USE NITROUS. 
        Giving yourself hypoxia due to not following basic instructions is akin IVing fresh shrooms straight into your arms and then getting a fungal infection and multiple organ failure. It is a failure to follow simple directions.
        The proper way to ingest nitrous without risking hypoxia is simple:
        a) Make sure to take plenty of breaths of fresh air between lung fulls of nitrous. Do not cycle breathe into a balloon to try to "make the most of the nitrous". 
        b) Use a balloon or let the gas expand into some type of container (such as a dispenser) so the gas can warm up before entering your lungs to prevent risk of cold burns or frostbite.
        c) If you have access to a tank, use it in the same manner as you would cannisters (take breaths in between, fill a container or balloon first before breathing it in, etc). Even if you have a tank, NEVER use a gas mask without professionals / experts in attendance, and even then only use masks if you are using a premixed blend of nitrous and oxygen. You do not want to accidentally end up in a scenario where you are too high to remove the gas mask from your face and slowly die to oxygen starvation while you're nitrous-holed out in another dimension. 
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/1fd89997-3a34-4f06-8c7b-872aa05dc954/olneyslesions.jpg?format={width}w",
)

add_scene(
    name="3) Vitamin B12 depletion (Very valid fear, but relatively easily mitigated)",
    narration="""
        Now this is the only "real" risk with nitrous. 
        Vitamin B12 depletion is a risk inherent to the pharmacology of nitrous itself. Although nitrous as a whole is essentially completely harmless, it has one glaring exception to this: each time you use it, your body's ability to absorb B12 is inhibited for about 3 days or so. 
        B12 is a vital vitamin that helps myelinate your neurons (add protective shielding that increases their signal efficiency), and *without it you will eventually develop horrifying MS-like symptoms* (MS is a neurodegenerative disease where your neurons lose their myelinated sheaths. Chronic daily nitrous use across the span of several years can also lead to a similar outcome as MS. 
        However, the fix is simple: Every exposure to nitrous restarts the 3 day clock, but once you are already exposed, 5 canisters doesn't change your absorption too significantly compared to doing 50 canisters. Either way you lost the next 3 days of B12.
        Because of this, the best advice to stay safe with nitrous is to *use it infrequently, but on those rare days when you do, feel free to go ham and huff a bunch*, and as soon as you're done for the day, put it away again for at least 2 weeks to a month.
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/dc7e621a-7726-4593-99e7-e63b20f796a4/Cobalamin_skeletal.svg.png?format={width}w",
)

add_scene(
    name="So why the horror stories?",
    narration="""
        There are some horror stories about nitrous, but these mostly stem from folks who didn't heed the once every 2 weeks / month warning, and over time developed an addiction and dependence on the drug. Then their habit continues to escalate until years later they are going 24/7 constantly high on nitrous and haven't had a proper day of B12 absorption for months if not years. That's when the nerve damage and nightmares start.
        That same dark path can happen with almost every single drug out there if you ignore harm reduction for years at a time taking a drug 24/7. Daily MDMA, daily kratom, daily amphetamine (at recreational doses), daily phenibut, daily alcohol, daily cocaine use, etc every one of these could bring you just as dark a future as that of nitrous. There's very very few drugs in existence that have absolutely no downsides to being binged 24/7 for years at a time. Nitrous is not  in any way uniquely dangerous here. (Though it's arguable that end stage B12 deficiency is a more horrifying fate than a crippling opioid dependency, but even if that's technically true, I don't think any opioid addicts would see it as any consolation). 
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/6a75c11d-2b39-4f45-9503-bc1065bfb71c/NOS_Cracker_With_Balloon_And_Charger.jpg?format={width}w",
)

add_scene(
    name="Overall Conclusion",
    narration="""
        All things considered, if it wasn't for the B12 issue, nitrous would be considered one of the safest psychoactive drugs in existence, on par with or only slightly more risky than psychedelics and weed
        But we can't simply ignore the B12 issue. So with that included, and considering just how easy of a problem it is to mitigate, nitrous would probably be a middle of the pack drug in terms of safety and long term harm: comparable to ketamine, opce, fxe, and other similar dissos. They all share a similar safety profile:
        1) completely safe in every single way except for one pretty major exception: Nitrous with B12 depletion if you do it chronically, the Arylcyclohexylamines with bladder damage if you do it chronically. 
        2) Both are considered mildly to moderately addicting. They tend to be more psychologically reinforcing than psychedelics and weed, but far less so than coke, amph, mdma, opioids, alcohol, benzos, gabapentinoids, meth, z-drugs, barbiturates, deliriants, 4mmc, 3mmc, mdpv, you get the idea. 
        Most psychedelics and most phytocannabinoids (and low potency partial agonist synthetics) are less risky than nitrous 
        But just about every single other 100000 drugs in existence are more risky than nitrous. 
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/6a75c11d-2b39-4f45-9503-bc1065bfb71c/NOS_Cracker_With_Balloon_And_Charger.jpg?format={width}w",
)

add_scene(
    name="But isn't it still an inhalant? Aren't those drugs really bad for you? Why is Nitrous any different?",
    narration="""
        You're right that inhalants as a class are generally some of the single most damaging drugs in existence. Nitrous is within a small but substantial list of exceptions to this "inhalants are bad" rule.
        Most inhalants are made from volatile compounds with a high vapor pressure. *It's this volatility that's likely to contain or metabolize into harmful highly reactive compounds and free radicals*. Highly volatile oxygen species and free radicals cause a lot of oxidative stress on your neurons, potentially causing damage. Certain highly volatile compounds can also offset the ion balance in the brain, potentially leading to excess cations and an increased risk of excitotoxicity and seizures. As a whole, overly reactive compounds are typically bad news. Reactivity is generally helpful to allow for useful chemical reactions, but overly reactive compounds are likely to react to everything it touches, wrecking havok upon your body's biological structures
        But nitrous isn't a volatile compound producing highly reactive fumes. It is a stable gas. There's nothing inherently dangerous about gasses, that's just a state of matter. Any drug can be made into a gas if the right temperature and pressure is applied. That drug doesn't suddenly become more dangerous simply because of a phase shift. 
        Nitrous has very selective effect on the NMDA receptors and does not cause wide spread neurotoxicity and organ damage. 
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/6a75c11d-2b39-4f45-9503-bc1065bfb71c/NOS_Cracker_With_Balloon_And_Charger.jpg?format={width}w",
)

add_scene(
    name='Other drugs in the "safe inhalants" list',
    narration="""
        (Here, safe simply means "does not cause wide spread systemic failure like the volatile inhalants do. Many of the drugs in this list still possess risk factors of their own derived from their own primary mechanisms of action, rather than due to being an inhalant)
        Xenon (supposedly very similar in effect to nitrous but most say it's even more euphoric) 
        Chloroform (Despite the unfortunate reputation, chloroform is just an inhalant gabanergic and does not cause organ damage from volatile components. Chloroform is obviously risky due to its own mechanism of action though. 
        Amyl Nitrite (aka Poppers) no organ damage from volatile compounds. Any risk comes from the pharmacology of the drug itself not its formulation as an inhalant
        Alcohol (Did you know you can sniff alcohol fumes and get buzzed / drunk?) Controlling dosage is much harder when sniffing alcohol fumes, so accidental overdoses are more likely. But again other than the risks from the alcohol itself, the inhalant formulation does not cause any increased organ damage.
        Not every gas is the same as sniffing paint or gasoline.
    """,
    media_filepath=f"https://images.squarespace-cdn.com/content/v1/64b1beb639c2942d73a49116/d58e6f10-07e7-42a1-baef-c9db87a2c0fc/file-fL7hQtdcqXstqYAdxEujB48Z.png?format={width}w",
)

# TODO: do not read them, but include it visually
# add_scene(
#     name="Citations",
#     narration="""
#         https://pubmed.ncbi.nlm.nih.gov/26496821/ 
#         https://pubmed.ncbi.nlm.nih.gov/34427020/ ("The average age was 24 years, and mean canister consumption was 148 per day for 9 months." That's a far cry from responsible casual usage) 
#     """,
# )


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    import moviepy
    import moviepy.editor

    output_dir = os.path.join("data", "story", __file__.split("/")[-1].replace(".py", ""))
    background_video = moviepy.editor.VideoFileClip("data/backgrounds/euphoria-inspired-mood-lights.mp4", target_resolution=(height, width), audio=False)
    background_audio = moviepy.editor.AudioClip(lambda t: 0, duration=1)

    generate_video(scenes[:1], output_dir, background_video, background_audio)
    # generate_images(scenes[:1], output_dir)
