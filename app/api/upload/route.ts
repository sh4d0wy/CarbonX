import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: `${process.env.NEXT_PUBLIC_GATEWAY_URL}`
});
console.log("Pinata SDK initialized with JWT:", process.env.PINATA_JWT);

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const upload = await pinata.upload.public.file(file);

    return Response.json({
      hash: upload.cid, 
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}