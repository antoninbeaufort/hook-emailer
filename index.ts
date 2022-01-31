import { Application, Router, RouterContext } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const MAILJET_NEXT_API_URL = 'https://api.mailjet.com/v3.1'

const headers = new Headers();
headers.set('Content-Type', 'application/json')
headers.set('Authorization', 'Basic ' + btoa(Deno.env.get('MJ_APIKEY_PUBLIC') + ":" + Deno.env.get('MJ_APIKEY_PRIVATE')))

const sendEmail = (messages: any): Promise<any> => {
  return fetch(MAILJET_NEXT_API_URL + '/send', {
      method: "POST",
      headers,
      body: JSON.stringify({
          Messages: messages,
      }),
  });
}

const betterParseInt = (val: unknown) => {
  if (typeof val === 'string') {
    return parseInt(val.replace(/\D/g, ''), 10);
  }
  if (typeof val === 'number') {
    return val;
  }
}
const router = new Router();
router
  .post("/", async (context: RouterContext) => {
    try {
      const body = await context.request.body().value
      const entities = body.entities
        .filter((entity: any) => entity.text)
        .map((entity: any) => ({ [entity.name]: betterParseInt(entity.text) }))

      const message = JSON.stringify(entities)
      let Filename = 'result.json'
      if (body.metadata && body.metadata.total_page && body.metadata.total_page.length && body.metadata.total_page.document_name) {
        Filename = body.metadata?.total_page[0]?.document_name?.replace('.pdf', '.json')
      }
      const response = await sendEmail([
        {
          From: {
            Email: 'test@thegreenalternative.fr',
            Name: 'The Green Alternative - Test'
          },
          To: [
            {
              Email: Deno.env.get('TO_EMAIL'),
              Name: 'Test',
            },
          ],
          Subject: 'Hook received',
          TextPart: 'JSON file attached with the hook data.',
          Attachments: [
            {
              ContentType: 'application/json',
              Filename,
              Base64Content: btoa(unescape(encodeURIComponent(message))),
            }
          ],
        },
      ])
      context.response.status = 200
      context.response.headers.set("Content-Type", "application/json")
      const jsonRes = await response.json()
      if (!response.ok) {
        console.error(jsonRes)
      }
      context.response.body = {
        success: response.ok,
        ...(!response.ok && { jsonRes })
      }
    } catch (error) {
      console.error(error)
      context.response.status = 400
      context.response.headers.set("Content-Type", "application/json")
      context.response.body = {
        error
      }
    }
  });

const app = new Application();
app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());

console.info("CORS-enabled web server listening on port 8000");
await app.listen({ port: 8000 });
