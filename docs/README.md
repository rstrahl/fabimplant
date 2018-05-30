
## The Objective

To improve on the current state-of-the-industry techniques used for reducing risk and optimizing results during the oral/maxillofacial surgery involved with dental implants. At that time, the vast majority of surgeries were performed in one of two ways:

**Performed "Free-hand"** - relying only on the memory of the surgical plan devised using software provided by vendors such as [Carestream](https://www.carestream.com/en/us), and the steady hand of the surgeon; while common practice, this is high-risk.

**Using a hand-crafted stent** - sculpted from a cast of the patient's surgical area; this reduces the risk significantly, but will be based on the soft tissue surface (not bone), requires additional cost, and delays the surgery due to the time required by the sculptor.

## The Proposition

Surgeons use diagnostic imaging technology such as [Cone-Beam Computed Tomography](https://en.wikipedia.org/wiki/Cone_beam_computed_tomography) (CBCT) to study the area of the mandible/maxilla where the implant will be placed. This imagery data is volumetric, and thus can be used to generate a 3D model.

With a 3D model and metadata specifying dimensions and scale, combined with the placement vector data from the implant planning software, it may be possible to compute a 3D model of a surgical stent with accurate drill guides. 3D printing technology has entered consumer feasibility, and can be used to fabricate the 3D model using [bio-compatible polymers](https://www.sciencedirect.com/science/article/pii/S0169409X16300989) such as PLA.

This would reduce risk by providing a strong drill guide fitted precisely to the bone surface of the surgery area, and optimize results by ensuring the drill guides conform precisely to their vectors from the planning software.

## The Conclusion

While there was success in being able to use the CBCT imagery data to compute a 3D model, CBCT technology is inherently limited in its ability to produce sufficiently usable data.

CT imagery suffers from the problem of being subject to interference from metal, creating artifacts in the resulting image data. Mitigating this problem is a topic of extensive, continued academic research with no reasonably effective solution found. As metal is a common element in mouths, this is a terminal obstacle.
