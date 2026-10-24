import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { directionsUrl } from "@/components/Outcome";
import { hygieneText, PlacePhoto, Stars } from "@/components/place";
import { Badge, Body, Button, H2, Loading, Notice, Screen } from "@/components/ui";
import { placeDetails, type PlaceDetails } from "@/lib/api";
import { priceLabel } from "@/lib/constants";
import { useApp } from "@/lib/store";
import { useColors } from "@/lib/theme";

export default function Place() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const summary = useApp((s) => (id ? s.known[id] : undefined));
  const [d, setD] = useState<PlaceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    placeDetails(id).then((x) => live && setD(x)).catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id]);

  if (error) return <Screen><Notice tone="error" text={error} /></Screen>;
  if (!d) return <Screen><Loading text="Loading details…" /></Screen>;

  const photoW = Math.min(480, width - 32);
  const hy = hygieneText(summary?.hygiene ?? null);
  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Screen>
      <Stack.Screen options={{ title: d.name }} />
      {d.photos.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: 16 }}>
          {d.photos.map((ph) => (
            <View key={ph.name} style={{ width: photoW }}>
              <PlacePhoto name={d.name} photo={ph.name} label={d.type} height={230} width={1000} />
              {ph.credit ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>Photo: {ph.credit}</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ color: c.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.8 }}>{d.name}</Text>
        <Text style={{ color: c.muted }}>{d.type} · {priceLabel(d.priceLevel)}</Text>
        <Stars rating={d.rating} count={d.ratingCount} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {summary ? <Badge text={summary.chain ? "Chain" : "Independent"} tone={summary.chain ? "muted" : "good"} /> : null}
        {d.openNow === true ? <Badge text="Open now" tone="good" /> : d.openNow === false ? <Badge text="Closed now" tone="muted" /> : null}
        {hy ? <Badge text={hy} /> : null}
        {d.vegetarian ? <Badge text="Vegetarian options" /> : null}
        {d.vegan ? <Badge text="Vegan options" /> : null}
        {d.takeout ? <Badge text="Takeaway" /> : null}
        {d.reservable ? <Badge text="Takes bookings" /> : null}
      </View>

      {d.summary ? <Body>{d.summary}</Body> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {d.website ? <Button title="Menu & website" onPress={() => open(d.website!)} style={{ flexGrow: 1 }} /> : null}
        {summary || d.mapsUrl ? (
          <Button
            title="Directions"
            kind={d.website ? "secondary" : "primary"}
            onPress={() => open(summary ? directionsUrl(summary) : d.mapsUrl!)}
            style={{ flexGrow: 1 }}
          />
        ) : null}
        {d.phone ? <Button title={`Call ${d.phone}`} kind="secondary" onPress={() => open(`tel:${d.phone!.replace(/\s/g, "")}`)} style={{ flexGrow: 1 }} /> : null}
      </View>
      {!d.website ? <Body muted style={{ fontSize: 14 }}>This place doesn't list a website on Google, so there's no menu link yet.</Body> : null}

      {d.address ? <Body muted>{d.address}</Body> : null}

      {d.hours.length ? (
        <View style={{ gap: 6 }}>
          <H2>Opening hours</H2>
          {d.hours.map((h) => <Text key={h} style={{ color: c.ink, fontVariant: ["tabular-nums"] }}>{h}</Text>)}
        </View>
      ) : null}

      {d.reviews.length ? (
        <View style={{ gap: 12 }}>
          <H2>Reviews</H2>
          {d.reviews.map((r, i) => (
            <View key={i} style={{ gap: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ color: c.ink, fontWeight: "600" }}>
                {r.author}
                <Text style={{ color: c.muted, fontWeight: "400" }}>{r.when ? ` · ${r.when}` : ""}</Text>
              </Text>
              {r.rating ? <Text style={{ color: c.star }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text> : null}
              <Text style={{ color: c.ink, lineHeight: 21 }}>{r.text}</Text>
            </View>
          ))}
          <Body muted style={{ fontSize: 13 }}>Reviews from Google</Body>
        </View>
      ) : null}
    </Screen>
  );
}
